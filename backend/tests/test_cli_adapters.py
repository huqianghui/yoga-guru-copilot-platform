"""Tests for CLI agent adapters — availability detection and command building."""
import pytest
from unittest.mock import patch, AsyncMock

from app.services.agents.adapters.claude_code import ClaudeCodeAdapter
from app.services.agents.adapters.codex_cli import CodexCLIAdapter
from app.services.agents.adapters.copilot_cli import CopilotCLIAdapter


# All adapters now use _check_command (shutil.which via asyncio.to_thread).
# Patch at app.services.agents.base where shutil.which is called.
_WHICH_PATCH = "app.services.agents.base.shutil.which"
_SUBPROCESS_PATCH = "app.services.agents.base.asyncio.create_subprocess_exec"


class TestClaudeCodeAdapter:
    def test_adapter_name(self):
        adapter = ClaudeCodeAdapter()
        assert adapter.name == "claude-code"

    @pytest.mark.asyncio
    async def test_is_available_when_installed(self):
        adapter = ClaudeCodeAdapter()
        with patch(_WHICH_PATCH, return_value="/usr/local/bin/claude"):
            assert await adapter.is_available() is True

    @pytest.mark.asyncio
    async def test_is_available_when_not_installed(self):
        adapter = ClaudeCodeAdapter()
        with patch(_WHICH_PATCH, return_value=None):
            assert await adapter.is_available() is False

    @pytest.mark.asyncio
    async def test_get_version_returns_none_when_not_installed(self):
        adapter = ClaudeCodeAdapter()
        with patch(_SUBPROCESS_PATCH, side_effect=FileNotFoundError):
            version = await adapter.get_version()
            assert version is None

    @pytest.mark.asyncio
    async def test_get_tools(self):
        adapter = ClaudeCodeAdapter()
        tools = await adapter.get_tools()
        assert "Read" in tools
        assert "Write" in tools
        assert "Bash" in tools


class TestCodexCLIAdapter:
    def test_adapter_name(self):
        adapter = CodexCLIAdapter()
        assert adapter.name == "codex-cli"

    @pytest.mark.asyncio
    async def test_is_available_when_installed(self):
        adapter = CodexCLIAdapter()
        with patch(_WHICH_PATCH, return_value="/usr/local/bin/codex"):
            assert await adapter.is_available() is True

    @pytest.mark.asyncio
    async def test_is_available_when_not_installed(self):
        adapter = CodexCLIAdapter()
        with patch(_WHICH_PATCH, return_value=None):
            assert await adapter.is_available() is False

    @pytest.mark.asyncio
    async def test_get_tools(self):
        adapter = CodexCLIAdapter()
        tools = await adapter.get_tools()
        assert "Shell" in tools
        assert "FileRead" in tools


class TestCopilotCLIAdapter:
    def test_adapter_name(self):
        adapter = CopilotCLIAdapter()
        assert adapter.name == "copilot-cli"

    @pytest.mark.asyncio
    async def test_is_available_when_neither_installed(self):
        adapter = CopilotCLIAdapter()
        with patch(_WHICH_PATCH, return_value=None):
            assert await adapter.is_available() is False

    @pytest.mark.asyncio
    async def test_is_available_when_standalone_copilot(self):
        """Standalone copilot binary should be preferred."""
        adapter = CopilotCLIAdapter()

        def fake_which(cmd):
            return "/usr/local/bin/copilot" if cmd == "copilot" else None

        with patch(_WHICH_PATCH, side_effect=fake_which):
            assert await adapter.is_available() is True

    @pytest.mark.asyncio
    async def test_is_available_gh_extension_missing(self):
        """gh exists but copilot extension is not installed."""
        adapter = CopilotCLIAdapter()

        def fake_which(cmd):
            if cmd == "copilot":
                return None
            if cmd == "gh":
                return "/usr/local/bin/gh"
            return None

        mock_proc = AsyncMock()
        mock_proc.communicate = AsyncMock(return_value=(b"", b""))
        mock_proc.returncode = 1

        with patch(_WHICH_PATCH, side_effect=fake_which), \
             patch(_SUBPROCESS_PATCH, return_value=mock_proc):
            # _get_command_output returns None on non-zero exit or timeout
            assert await adapter.is_available() is False

    @pytest.mark.asyncio
    async def test_get_tools(self):
        adapter = CopilotCLIAdapter()
        tools = await adapter.get_tools()
        assert "Suggest" in tools
        assert "Shell" in tools
