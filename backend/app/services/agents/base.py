"""Agent adapter base classes, data types, and shared utilities."""

import asyncio
import json
import logging
import os
import re
import shutil
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, AsyncIterator

logger = logging.getLogger(__name__)


class AgentMode(str, Enum):
    CHAT = "chat"
    PLAN = "plan"
    ASK = "ask"
    CODE = "code"


@dataclass
class AgentContext:
    module: str = ""           # e.g., "course-planning", "video-analysis"
    page_data: dict = field(default_factory=dict)
    user_id: str = ""


@dataclass
class AgentRequest:
    prompt: str
    session_id: str = ""
    agent_name: str = ""
    mode: AgentMode = AgentMode.CHAT
    context: AgentContext = field(default_factory=AgentContext)
    history: list[dict] = field(default_factory=list)


@dataclass
class AgentEvent:
    type: str       # "text" | "code" | "error" | "done" | "session_init"
    content: str = ""
    session_id: str = ""
    metadata: dict = field(default_factory=dict)


class BaseAgentAdapter(ABC):
    name: str = ""

    @abstractmethod
    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        """Stream agent events for the given request."""
        yield AgentEvent(type="error", content="Not implemented")

    async def is_available(self) -> bool:
        return True

    async def get_version(self) -> str | None:
        return None

    async def get_tools(self) -> list[str]:
        return []

    async def get_mcp_servers(self) -> list[str]:
        return []

    async def get_config(self) -> dict:
        return {}

    def get_subprocess_env(self) -> dict[str, str]:
        """Extra env vars to inject into agent subprocess. Override in subclass."""
        return {}


# ---------------------------------------------------------------------------
# Shared utility functions (public API — imported by adapters)
# ---------------------------------------------------------------------------

SENSITIVE_KEYS_RE = re.compile(
    r"(token|key|secret|password|credential|auth)",
    re.IGNORECASE,
)


def redact_sensitive(data: Any, depth: int = 0) -> Any:
    """Recursively mask values whose keys match sensitive patterns.

    This is the single redaction function used across the codebase.
    Replaces entire sensitive string values with ``***REDACTED***``.
    """
    if depth > 10:
        return data
    if isinstance(data, dict):
        return {
            k: (
                "***REDACTED***"
                if isinstance(v, str) and SENSITIVE_KEYS_RE.search(k)
                else redact_sensitive(v, depth + 1)
            )
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [redact_sensitive(item, depth + 1) for item in data]
    return data


async def check_command(cmd: str) -> bool:
    """Check if a command exists on PATH."""
    return await asyncio.to_thread(shutil.which, cmd) is not None


async def get_command_output(cmd: str, *args: str) -> str | None:
    """Execute a command and return stdout.

    Returns None when the process exits with a non-zero code, produces no
    stdout, or when an OS-level error occurs.
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            cmd, *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        if proc.returncode != 0:
            return None
        return stdout.decode().strip() if stdout else None
    except (TimeoutError, FileNotFoundError, OSError):
        return None


async def stream_subprocess(
    cmd: list[str],
    cwd: str | None = None,
    timeout: float = 300,
    extra_env: dict[str, str] | None = None,
) -> AsyncGenerator[AgentEvent, None]:
    """Launch subprocess and stream AgentEvent from stdout.

    - stdin=DEVNULL to prevent interactive blocking
    - stderr drained in background to avoid deadlock
    - Extra env vars merged into subprocess environment
    """
    clean_env = {
        k: v for k, v in os.environ.items()
        if k not in ("CLAUDECODE", "CLAUDE_CODE_SESSION", "CLAUDE_SESSION_ID")
    }
    if extra_env:
        clean_env.update(extra_env)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=clean_env,
        cwd=cwd,
    )

    stderr_chunks: list[bytes] = []

    async def _drain_stderr() -> None:
        if proc.stderr:
            stderr_chunks.append(await proc.stderr.read())

    stderr_task = asyncio.create_task(_drain_stderr())

    deadline = asyncio.get_running_loop().time() + timeout
    event_count = 0
    try:
        assert proc.stdout is not None
        async for line in proc.stdout:
            if asyncio.get_running_loop().time() > deadline:
                yield AgentEvent(type="error", content=f"Agent timed out after {timeout}s")
                break
            text = line.decode("utf-8", errors="replace").rstrip()
            if not text:
                continue
            try:
                data = json.loads(text)
                event_count += 1
                yield parse_json_event(data)
            except json.JSONDecodeError:
                event_count += 1
                yield AgentEvent(type="text", content=text)
    finally:
        if proc.returncode is None:
            proc.terminate()
        await proc.wait()
        await stderr_task

    # If no stdout events and process failed, report stderr
    if event_count == 0 and proc.returncode and proc.returncode != 0:
        stderr_text = b"".join(stderr_chunks).decode("utf-8", errors="replace").strip()
        yield AgentEvent(
            type="error",
            content=(stderr_text or f"Agent process exited with code {proc.returncode}"),
        )


def extract_text(content: object) -> str:
    """Extract plain text from Claude-style content (string, list of blocks, or other)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "".join(parts)
    return str(content) if content else ""


def parse_json_event(data: dict) -> AgentEvent:
    """Convert a JSON line to AgentEvent."""
    event_type = data.get("type", "text")
    raw_content = data.get("content", "")
    if not raw_content:
        msg = data.get("message")
        if isinstance(msg, dict):
            raw_content = msg.get("content", "")
        elif isinstance(msg, str):
            raw_content = msg
    return AgentEvent(type=event_type, content=extract_text(raw_content), metadata=data)


# ---------------------------------------------------------------------------
# Config file reading helpers
# ---------------------------------------------------------------------------


def read_json_config(path: str | Path) -> dict:
    """Read a JSON config file with secrets redacted."""
    try:
        p = Path(path).expanduser()
        if not p.is_file():
            return {}
        raw = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            return redact_sensitive(raw)
        return {"data": raw}
    except Exception:
        logger.debug("Failed to read JSON config %s", path, exc_info=True)
        return {}


def read_json_config_raw(path: str | Path) -> dict:
    """Read a JSON config file WITHOUT masking (for subprocess env injection)."""
    try:
        p = Path(path).expanduser()
        if not p.is_file():
            return {}
        raw = json.loads(p.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        logger.debug("Failed to read raw JSON config %s", path, exc_info=True)
        return {}


def read_toml_config(path: str | Path) -> dict:
    """Read a TOML config file with secrets redacted."""
    try:
        import tomllib
    except ModuleNotFoundError:
        return {}
    try:
        p = Path(path).expanduser()
        if not p.is_file():
            return {}
        with open(p, "rb") as f:
            raw = tomllib.load(f)
        if isinstance(raw, dict):
            return redact_sensitive(raw)
        return {"data": raw}
    except Exception:
        logger.debug("Failed to read TOML config %s", path, exc_info=True)
        return {}


def read_toml_config_raw(path: str | Path) -> dict:
    """Read a TOML config file WITHOUT masking."""
    try:
        import tomllib
    except ModuleNotFoundError:
        return {}
    try:
        p = Path(path).expanduser()
        if not p.is_file():
            return {}
        with open(p, "rb") as f:
            raw = tomllib.load(f)
        return raw if isinstance(raw, dict) else {}
    except Exception:
        logger.debug("Failed to read raw TOML config %s", path, exc_info=True)
        return {}
