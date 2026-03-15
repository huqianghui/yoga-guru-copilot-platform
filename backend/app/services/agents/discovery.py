"""Discover locally-installed CLI agents and read their config files."""
import json
import logging
from pathlib import Path

from app.services.agents.base import redact_sensitive
from app.services.agents.registry import registry

logger = logging.getLogger(__name__)

# Canonical mapping from adapter name → DB agent_config name.
# Used by startup, router, and discovery to avoid hardcoded dicts.
ADAPTER_TO_CONFIG_NAME: dict[str, str] = {
    "claude-code": "claude-code",
    "codex-cli": "codex-cli",
    "copilot-cli": "github-copilot",
}


def _read_json(path: Path) -> dict | None:
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        logger.warning("Failed to read %s: %s", path, e)
    return None


def _read_toml(path: Path) -> dict | None:
    try:
        if path.exists():
            import tomllib
            with open(path, "rb") as f:
                return tomllib.load(f)
    except Exception as e:
        logger.warning("Failed to read %s: %s", path, e)
    return None


def _find_project_root() -> Path | None:
    """Walk up from CWD to find a directory containing .claude/ or .git/."""
    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        if (parent / ".claude").is_dir() or (parent / ".git").is_dir():
            return parent
        if parent == parent.parent:
            break
    return None


def _deep_merge(base: dict, override: dict) -> dict:
    """Deep merge two dicts. override takes precedence for non-dict values."""
    merged = base.copy()
    for key, value in override.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def read_claude_config() -> dict:
    """Read Claude Code config from multiple sources (merged).

    Sources (in priority order, later overrides earlier):
    1. ~/.claude/settings.json (global)
    2. ~/.claude/settings.local.json (global local)
    3. <project>/.claude/settings.json (project)
    4. <project>/.claude/settings.local.json (project local)
    """
    home = Path.home()
    config: dict = {}

    # Global settings
    settings = _read_json(home / ".claude" / "settings.json")
    if settings:
        config = _deep_merge(config, settings)
        logger.debug("Loaded global Claude settings from %s", home / ".claude" / "settings.json")

    local = _read_json(home / ".claude" / "settings.local.json")
    if local:
        config = _deep_merge(config, local)
        logger.debug("Loaded global Claude local settings")

    # Project-level settings
    project_root = _find_project_root()
    if project_root:
        proj_settings = _read_json(project_root / ".claude" / "settings.json")
        if proj_settings:
            config = _deep_merge(config, proj_settings)
            logger.debug("Loaded project Claude settings from %s", project_root / ".claude" / "settings.json")

        proj_local = _read_json(project_root / ".claude" / "settings.local.json")
        if proj_local:
            config = _deep_merge(config, proj_local)
            logger.debug("Loaded project Claude local settings")

    if config:
        mcp_count = len(config.get("mcpServers", {}))
        tools_count = len(config.get("permissions", {}).get("allow", []))
        logger.info("Claude config loaded: %d MCP servers, %d allowed tools", mcp_count, tools_count)

    return config


def read_codex_config() -> dict:
    """Read Codex CLI config from ~/.codex/config.toml or config.json."""
    home = Path.home()

    toml_conf = _read_toml(home / ".codex" / "config.toml")
    if toml_conf:
        return toml_conf

    json_conf = _read_json(home / ".codex" / "config.json")
    if json_conf:
        return json_conf

    return {}


async def discover_agent(name: str) -> dict:
    """Probe a single CLI agent and return its info."""
    adapter = registry.get(name)
    if not adapter:
        return {"name": name, "available": False, "error": "No adapter registered"}

    result: dict = {"name": name, "available": False}

    try:
        result["available"] = await adapter.is_available()
    except Exception:
        result["available"] = False

    if hasattr(adapter, "get_version"):
        try:
            version = await adapter.get_version()
            if version:
                result["version"] = version
        except Exception:
            pass

    # Get tools from adapter
    if hasattr(adapter, "get_tools"):
        try:
            tools = await adapter.get_tools()
            if tools:
                result["tools"] = tools
        except Exception:
            pass

    # Get MCP servers from adapter (uses CLI commands like `claude mcp list`)
    if hasattr(adapter, "get_mcp_servers"):
        try:
            mcp_servers = await adapter.get_mcp_servers()
            if mcp_servers:
                result["mcp_servers"] = mcp_servers
        except Exception:
            pass

    # Read config files for additional metadata
    if hasattr(adapter, "get_config"):
        try:
            config = await adapter.get_config()
            if config:
                result["config"] = config
        except Exception:
            pass

    # Agent-specific extras
    if name == "claude-code":
        config = read_claude_config()
        if config:
            if "config" not in result:
                result["config"] = config
            # Fallback: if adapter didn't return MCP servers, try config
            if "mcp_servers" not in result:
                mcp = config.get("mcpServers", {})
                if mcp:
                    result["mcp_servers"] = list(mcp.keys())
            # Fallback: if adapter didn't return tools, try config
            if "tools" not in result:
                tools = config.get("permissions", {}).get("allow", [])
                if tools:
                    result["tools"] = tools
    elif name == "codex-cli":
        config = read_codex_config()
        if config:
            if "config" not in result:
                result["config"] = config
            if "model" in config:
                result["model_name"] = config["model"]

    return result


async def discover_all_agents() -> list[dict]:
    """Probe all known CLI agents."""
    agent_names = ["claude-code", "codex-cli", "copilot-cli"]
    results = []
    for name in agent_names:
        info = await discover_agent(name)
        results.append(info)
        logger.info("Agent %s: available=%s, tools=%s, mcp=%s",
                     name, info.get("available"),
                     len(info.get("tools", [])),
                     len(info.get("mcp_servers", [])))
    return results
