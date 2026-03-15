"""Tests for agent event parsing functions."""
from app.services.agents.base import AgentEvent, parse_json_event, extract_text
from app.services.agents.adapters.codex_cli import _parse_codex_event
from app.services.agents.adapters.copilot_cli import _parse_copilot_event


# ---------------------------------------------------------------------------
# parse_json_event (base.py)
# ---------------------------------------------------------------------------


class TestParseJsonEvent:
    def test_simple_text_event(self):
        data = {"type": "text", "content": "hello"}
        event = parse_json_event(data)
        assert event.type == "text"
        assert event.content == "hello"

    def test_error_event(self):
        data = {"type": "error", "content": "something broke"}
        event = parse_json_event(data)
        assert event.type == "error"
        assert event.content == "something broke"

    def test_content_from_message_dict(self):
        data = {"type": "text", "message": {"content": "from message"}}
        event = parse_json_event(data)
        assert event.content == "from message"

    def test_content_from_message_string(self):
        data = {"type": "text", "message": "plain string"}
        event = parse_json_event(data)
        assert event.content == "plain string"

    def test_defaults_type_to_text(self):
        data = {"content": "no type field"}
        event = parse_json_event(data)
        assert event.type == "text"

    def test_metadata_is_original_data(self):
        data = {"type": "text", "content": "x", "extra": 42}
        event = parse_json_event(data)
        assert event.metadata == data
        assert event.metadata["extra"] == 42

    def test_empty_content(self):
        data = {"type": "text"}
        event = parse_json_event(data)
        assert event.content == ""


class TestExtractText:
    def test_string_passthrough(self):
        assert extract_text("hello") == "hello"

    def test_list_of_text_blocks(self):
        blocks = [
            {"type": "text", "text": "part1"},
            {"type": "text", "text": "part2"},
        ]
        assert extract_text(blocks) == "part1part2"

    def test_list_skips_non_text_blocks(self):
        blocks = [
            {"type": "image", "url": "img.png"},
            {"type": "text", "text": "only text"},
        ]
        assert extract_text(blocks) == "only text"

    def test_other_type(self):
        assert extract_text(42) == "42"

    def test_none(self):
        assert extract_text(None) == ""


# ---------------------------------------------------------------------------
# _parse_codex_event (codex_cli.py)
# ---------------------------------------------------------------------------


class TestParseCodexEvent:
    def test_thread_started_with_id(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "thread.started", "thread_id": "t-123"},
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "session_init"

    def test_thread_started_without_id(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "thread.started"},
        )
        result = _parse_codex_event(event)
        assert result is None

    def test_turn_started_skipped(self):
        event = AgentEvent(type="text", content="", metadata={"type": "turn.started"})
        assert _parse_codex_event(event) is None

    def test_turn_completed_skipped(self):
        event = AgentEvent(type="text", content="", metadata={"type": "turn.completed"})
        assert _parse_codex_event(event) is None

    def test_turn_failed(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "turn.failed", "error": {"message": "oops"}},
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "error"
        assert result.content == "oops"

    def test_turn_failed_default_message(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "turn.failed", "error": {}},
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.content == "Agent turn failed"

    def test_error_event(self):
        event = AgentEvent(
            type="text", content="fallback",
            metadata={"type": "error", "message": "bad request"},
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "error"
        assert result.content == "bad request"

    def test_item_completed_agent_message(self):
        event = AgentEvent(
            type="text", content="",
            metadata={
                "type": "item.completed",
                "item": {"type": "agent_message", "text": "Hello world"},
            },
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "text"
        assert result.content == "Hello world"

    def test_item_completed_command_execution(self):
        event = AgentEvent(
            type="text", content="",
            metadata={
                "type": "item.completed",
                "item": {
                    "type": "command_execution",
                    "command": "ls",
                    "aggregated_output": "file.txt\n",
                },
            },
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "code"
        assert "$ ls" in result.content
        assert "file.txt" in result.content

    def test_item_started_command_execution_skipped(self):
        event = AgentEvent(
            type="text", content="",
            metadata={
                "type": "item.started",
                "item": {"type": "command_execution", "command": "ls"},
            },
        )
        result = _parse_codex_event(event)
        assert result is None

    def test_item_completed_reasoning_skipped(self):
        event = AgentEvent(
            type="text", content="",
            metadata={
                "type": "item.completed",
                "item": {"type": "reasoning", "text": "thinking..."},
            },
        )
        result = _parse_codex_event(event)
        assert result is None

    def test_legacy_message_delta(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "message.delta", "delta": "chunk"},
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "text"
        assert result.content == "chunk"

    def test_legacy_exec_output(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "exec.output", "output": "result"},
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "code"
        assert result.content == "result"

    def test_fallback_with_content(self):
        event = AgentEvent(
            type="text", content="unknown but has content",
            metadata={"type": "unknown.type"},
        )
        result = _parse_codex_event(event)
        assert result is not None
        assert result.type == "text"
        assert result.content == "unknown but has content"

    def test_unknown_without_content_returns_none(self):
        event = AgentEvent(type="text", content="", metadata={"type": "unknown.type"})
        result = _parse_codex_event(event)
        assert result is None


# ---------------------------------------------------------------------------
# _parse_copilot_event (copilot_cli.py)
# ---------------------------------------------------------------------------


class TestParseCopilotEvent:
    def test_error_event(self):
        event = AgentEvent(
            type="text", content="fallback",
            metadata={"type": "error", "message": "auth failed"},
        )
        result = _parse_copilot_event(event)
        assert result is not None
        assert result.type == "error"
        assert result.content == "auth failed"

    def test_error_event_fallback_content(self):
        event = AgentEvent(
            type="text", content="original",
            metadata={"type": "error"},
        )
        result = _parse_copilot_event(event)
        assert result is not None
        assert result.type == "error"
        assert result.content == "original"

    def test_message_delta_with_content(self):
        event = AgentEvent(
            type="text", content="",
            metadata={
                "type": "assistant.message_delta",
                "data": {"deltaContent": "hello "},
            },
        )
        result = _parse_copilot_event(event)
        assert result is not None
        assert result.type == "text"
        assert result.content == "hello "

    def test_message_delta_empty_returns_none(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "assistant.message_delta", "data": {"deltaContent": ""}},
        )
        result = _parse_copilot_event(event)
        assert result is None

    def test_assistant_message_skipped(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "assistant.message"},
        )
        assert _parse_copilot_event(event) is None

    def test_result_with_session_id(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "result", "sessionId": "sess-42"},
        )
        result = _parse_copilot_event(event)
        assert result is not None
        assert result.type == "session_init"
        assert result.session_id == "sess-42"

    def test_result_without_session_id(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "result"},
        )
        assert _parse_copilot_event(event) is None

    def test_lifecycle_events_skipped(self):
        for event_type in [
            "user.message",
            "assistant.turn_start",
            "assistant.turn_end",
            "assistant.reasoning_delta",
            "assistant.reasoning",
        ]:
            event = AgentEvent(type="text", content="", metadata={"type": event_type})
            assert _parse_copilot_event(event) is None, f"{event_type} should be skipped"

    def test_legacy_system_init_with_session(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "system", "subtype": "init", "session_id": "s-1"},
        )
        result = _parse_copilot_event(event)
        assert result is not None
        assert result.type == "session_init"
        assert result.session_id == "s-1"

    def test_legacy_system_non_init(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "system", "subtype": "other"},
        )
        assert _parse_copilot_event(event) is None

    def test_legacy_session_started_with_id(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "session.started", "session_id": "s-2"},
        )
        result = _parse_copilot_event(event)
        assert result is not None
        assert result.type == "session_init"

    def test_legacy_session_ended_skipped(self):
        event = AgentEvent(
            type="text", content="",
            metadata={"type": "session.ended"},
        )
        assert _parse_copilot_event(event) is None

    def test_fallback_with_content(self):
        event = AgentEvent(
            type="text", content="unknown stuff",
            metadata={"type": "custom.event"},
        )
        result = _parse_copilot_event(event)
        assert result is not None
        assert result.type == "text"
        assert result.content == "unknown stuff"

    def test_unknown_without_content_returns_none(self):
        event = AgentEvent(type="text", content="", metadata={"type": "custom.event"})
        assert _parse_copilot_event(event) is None
