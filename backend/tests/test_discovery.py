"""Tests for agent discovery service — config parsing and redaction."""
import json
import pytest
from pathlib import Path
from unittest.mock import patch

from app.services.agents.base import redact_sensitive
from app.services.agents.discovery import read_claude_config


class TestRedactSensitive:
    def test_redacts_token_keys(self):
        data = {"api_token": "sk-12345", "name": "test"}
        result = redact_sensitive(data)
        assert result["api_token"] == "***REDACTED***"
        assert result["name"] == "test"

    def test_redacts_key_keys(self):
        data = {"api_key": "abc123", "model": "gpt-4"}
        result = redact_sensitive(data)
        assert result["api_key"] == "***REDACTED***"
        assert result["model"] == "gpt-4"

    def test_redacts_secret_keys(self):
        data = {"client_secret": "mysecret", "url": "https://example.com"}
        result = redact_sensitive(data)
        assert result["client_secret"] == "***REDACTED***"
        assert result["url"] == "https://example.com"

    def test_redacts_password_keys(self):
        data = {"password": "hunter2"}
        result = redact_sensitive(data)
        assert result["password"] == "***REDACTED***"

    def test_redacts_nested_dicts(self):
        data = {"config": {"inner_key": "secret", "name": "test"}}
        result = redact_sensitive(data)
        assert result["config"]["inner_key"] == "***REDACTED***"
        assert result["config"]["name"] == "test"

    def test_redacts_in_lists(self):
        data = [{"api_key": "abc"}, {"name": "test"}]
        result = redact_sensitive(data)
        assert result[0]["api_key"] == "***REDACTED***"
        assert result[1]["name"] == "test"

    def test_non_string_values_not_redacted(self):
        data = {"token_count": 42, "has_key": True}
        result = redact_sensitive(data)
        # Non-string values should not be redacted
        assert result["token_count"] == 42
        assert result["has_key"] is True

    def test_preserves_non_sensitive_keys(self):
        data = {"model": "gpt-4", "temperature": 0.7, "max_tokens": 1000}
        result = redact_sensitive(data)
        assert result == data

    def test_depth_limit(self):
        # Build deeply nested dict
        data: dict = {"api_key": "secret"}
        current = data
        for _ in range(15):
            current["nested"] = {"api_key": "deep_secret"}
            current = current["nested"]
        result = redact_sensitive(data)
        # Top level should be redacted
        assert result["api_key"] == "***REDACTED***"


class TestReadClaudeConfig:
    def test_reads_settings_file(self, tmp_path: Path):
        settings = {"mcpServers": {"context7": {}}, "permissions": {"allow": ["Read", "Write"]}}
        settings_file = tmp_path / ".claude" / "settings.json"
        settings_file.parent.mkdir(parents=True)
        settings_file.write_text(json.dumps(settings))

        with patch("app.services.agents.discovery.Path.home", return_value=tmp_path), \
             patch("app.services.agents.discovery._find_project_root", return_value=None):
            config = read_claude_config()
            assert "mcpServers" in config
            assert "context7" in config["mcpServers"]

    def test_returns_empty_when_no_config(self, tmp_path: Path):
        with patch("app.services.agents.discovery.Path.home", return_value=tmp_path), \
             patch("app.services.agents.discovery._find_project_root", return_value=None):
            config = read_claude_config()
            assert config == {}

    def test_local_settings_override(self, tmp_path: Path):
        claude_dir = tmp_path / ".claude"
        claude_dir.mkdir()
        (claude_dir / "settings.json").write_text(json.dumps({"model": "old"}))
        (claude_dir / "settings.local.json").write_text(json.dumps({"model": "new"}))

        with patch("app.services.agents.discovery.Path.home", return_value=tmp_path), \
             patch("app.services.agents.discovery._find_project_root", return_value=None):
            config = read_claude_config()
            assert config["model"] == "new"

    def test_project_level_settings_merged(self, tmp_path: Path):
        """Project-level settings are merged with global settings."""
        home_dir = tmp_path / "home"
        proj_dir = tmp_path / "project"

        # Global settings: 1 MCP server
        (home_dir / ".claude").mkdir(parents=True)
        (home_dir / ".claude" / "settings.json").write_text(
            json.dumps({"mcpServers": {"global-mcp": {}}, "model": "global"})
        )
        # Project settings: additional MCP server + model override
        (proj_dir / ".claude").mkdir(parents=True)
        (proj_dir / ".claude" / "settings.json").write_text(
            json.dumps({"mcpServers": {"project-mcp": {}}, "model": "project"})
        )

        with patch("app.services.agents.discovery.Path.home", return_value=home_dir), \
             patch("app.services.agents.discovery._find_project_root", return_value=proj_dir):
            config = read_claude_config()
            # Both MCP servers should be present (deep merge)
            assert "global-mcp" in config["mcpServers"]
            assert "project-mcp" in config["mcpServers"]
            # Model should be overridden by project
            assert config["model"] == "project"
