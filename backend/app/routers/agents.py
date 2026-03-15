import json
import logging
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.agent_config import AgentConfig
from app.schemas.agent import (
    AgentConfigResponse, AgentConfigDetail, CreateSessionRequest,
    SessionResponse, ChatRequest, MessageResponse, AgentEventResponse,
)
from app.schemas.agent_config import (
    AgentConfigAdminResponse, AgentConfigCreate, AgentConfigUpdate, AdapterInfo,
)
from app.services.agents import session_proxy, dispatcher
from app.services.agents.base import AgentRequest, AgentContext, AgentMode
from app.services.agents.discovery import ADAPTER_TO_CONFIG_NAME
from app.services.agents.registry import registry
from app.services.agent_skill_service import AgentSkillService
from app.schemas.skill import SkillBriefResponse, SkillAssignRequest
from app.routers.admin import require_admin

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=list[AgentConfigResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentConfig).where(AgentConfig.available == True))  # noqa: E712
    return list(result.scalars().all())


# --- Admin CRUD endpoints (MUST be before /{agent_name} to avoid route conflicts) ---


@router.get("/adapters", response_model=list[AdapterInfo])
async def list_adapters(_: User = Depends(require_admin)):
    """List all registered AI adapters and their availability."""
    result = []
    for name, adapter in registry.list_all().items():
        available = await adapter.is_available()
        result.append(AdapterInfo(name=name, available=available))
    return result


@router.post("/refresh")
async def refresh_agents(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Re-probe all CLI agents and update DB with discovered info."""
    from app.services.agents.discovery import discover_all_agents

    results = await discover_all_agents()

    updated = []
    for info in results:
        agent_name = info["name"]
        config_name = ADAPTER_TO_CONFIG_NAME.get(agent_name, agent_name)

        result = await db.execute(select(AgentConfig).where(AgentConfig.name == config_name))
        config = result.scalar_one_or_none()
        if not config:
            continue

        config.available = info.get("available", False)
        if "version" in info:
            config.version = info["version"]
        if "tools" in info:
            config.tools = info["tools"]
        if "mcp_servers" in info:
            config.mcp_servers = info["mcp_servers"]
        if "model_name" in info:
            config.model_name = info["model_name"]

        updated.append({"name": config_name, "available": config.available, "version": config.version})

    await db.commit()
    return {"refreshed": updated}


@router.post("/configs", response_model=AgentConfigAdminResponse, status_code=201)
async def create_agent_config(
    body: AgentConfigCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Create a new agent configuration."""
    existing = await db.execute(
        select(AgentConfig).where(AgentConfig.name == body.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Agent '{body.name}' already exists")

    agent = AgentConfig(
        name=body.name,
        display_name=body.display_name,
        icon=body.icon,
        description=body.description,
        system_prompt=body.system_prompt,
        skills=body.skills,
        preferred_agent=body.preferred_agent,
        fallback_agents=body.fallback_agents,
        available=body.available,
        model_config_json=body.model_config_json,
        agent_type=body.agent_type,
        modes=body.modes,
        version=body.version,
        provider=body.provider,
        model_name=body.model_name,
        install_hint=body.install_hint,
        tools=body.tools,
        mcp_servers=body.mcp_servers,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.patch("/configs/{agent_name}", response_model=AgentConfigAdminResponse)
async def update_agent_config(
    agent_name: str,
    body: AgentConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Update an existing agent configuration."""
    result = await db.execute(
        select(AgentConfig).where(AgentConfig.name == agent_name)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(agent, key, value)

    await db.commit()
    await db.refresh(agent)
    return agent


@router.delete("/configs/{agent_name}", status_code=204)
async def delete_agent_config(
    agent_name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Delete an agent configuration."""
    result = await db.execute(
        select(AgentConfig).where(AgentConfig.name == agent_name)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await db.delete(agent)
    await db.commit()


# --- Agent config read endpoint ---


@router.get("/configs/{agent_name}/local-config")
async def get_agent_local_config(
    agent_name: str,
    _: User = Depends(require_admin),
):
    """Read agent's local config file with redacted secrets."""
    from app.services.agents.discovery import discover_agent, redact_sensitive
    info = await discover_agent(agent_name)
    config = info.get("config", {})
    return redact_sensitive(config)


# --- Agent-Skill assignment endpoints ---


@router.get("/{agent_name}/skills", response_model=list[SkillBriefResponse])
async def list_agent_skills(
    agent_name: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    svc = AgentSkillService(db)
    return await svc.list_skills_for_agent(agent_name)


@router.post("/{agent_name}/skills", status_code=201)
async def assign_skill_to_agent(
    agent_name: str,
    body: SkillAssignRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = AgentSkillService(db)
    link = await svc.assign_skill(agent_name, body.skill_id)
    return {"id": link.id, "agent_name": link.agent_name, "skill_id": link.skill_id}


@router.delete("/{agent_name}/skills/{skill_id}", status_code=204)
async def remove_skill_from_agent(
    agent_name: str,
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = AgentSkillService(db)
    removed = await svc.remove_skill(agent_name, skill_id)
    if not removed:
        raise HTTPException(404, "Assignment not found")


# --- Session delete endpoint ---


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a session and its messages."""
    deleted = await session_proxy.delete_session(db, session_id, user_id=user.id)
    if not deleted:
        raise HTTPException(404, "Session not found")


# --- Public endpoints ---


@router.get("/{agent_name}", response_model=AgentConfigDetail)
async def get_agent(agent_name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentConfig).where(AgentConfig.name == agent_name))
    config = result.scalar_one_or_none()
    if not config:
        from app.utils.exceptions import not_found
        not_found(f"Agent '{agent_name}' not found")
    return config


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    body: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = await session_proxy.create_session(
        db, body.agent_name, user.id,
        mode=body.mode, source=body.source,
    )
    return session


@router.get("/sessions/list", response_model=list[SessionResponse])
async def list_sessions(
    agent_name: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sessions = await session_proxy.list_sessions(db, user.id, agent_name)
    return sessions


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    messages = await session_proxy.get_messages(db, session_id)
    return messages


@router.post("/chat", response_model=AgentEventResponse)
async def chat_sync(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Non-streaming chat (for simple requests). Returns full response."""
    if body.session_id:
        session = await session_proxy.get_session(db, body.session_id)
        if not session:
            raise HTTPException(404, "Session not found")
    else:
        session = await session_proxy.create_session(db, "yoga-general", user.id)

    await session_proxy.add_message(db, session.id, "user", body.message)

    messages = await session_proxy.get_messages(db, session.id)
    history = [{"role": m.role, "content": m.content} for m in messages[:-1]]

    request = AgentRequest(
        prompt=body.message,
        agent_name=session.agent_name,
        history=history,
        context=AgentContext(user_id=user.id),
    )

    full_response = ""
    async for event in dispatcher.dispatch(db, session.agent_name, request):
        if event.type == "text":
            full_response += event.content
        elif event.type == "error":
            return AgentEventResponse(type="error", content=event.content, session_id=session.id)

    await session_proxy.add_message(db, session.id, "assistant", full_response)

    return AgentEventResponse(type="done", content=full_response, session_id=session.id)


def _mode_str_to_enum(mode_str: str) -> AgentMode:
    """Convert mode string to AgentMode enum."""
    mapping = {
        "plan": AgentMode.PLAN,
        "ask": AgentMode.ASK,
        "code": AgentMode.CODE,
        "chat": AgentMode.CHAT,
    }
    return mapping.get(mode_str, AgentMode.ASK)


async def _stream_adapter(
    websocket: WebSocket,
    adapter: object,
    request: AgentRequest,
    adapter_name: str,
) -> tuple[str, str | None]:
    """Stream events from a CLI adapter to the WebSocket.

    Returns (full_response_text, native_session_id).
    """
    full_response = ""
    native_session_id: str | None = None
    try:
        async for event in adapter.execute(request):  # type: ignore[union-attr]
            if event.type == "session_init":
                sid = event.session_id or event.metadata.get("session_id", "")
                if sid:
                    native_session_id = str(sid)
                continue
            await websocket.send_json({"type": event.type, "content": event.content})
            if event.type in ("text", "code"):
                full_response += event.content
    except Exception as exc:
        logger.exception("Error streaming from adapter %s", adapter_name)
        await websocket.send_json({"type": "error", "content": str(exc)})
    await websocket.send_json({"type": "done", "content": ""})
    return full_response, native_session_id


async def _stream_dispatcher(
    websocket: WebSocket,
    db: AsyncSession,
    agent_name: str,
    request: AgentRequest,
) -> str:
    """Stream events from the dispatcher to the WebSocket.

    Returns the full response text.
    """
    full_response = ""
    async for event in dispatcher.dispatch(db, agent_name, request):
        await websocket.send_json({"type": event.type, "content": event.content})
        if event.type == "text":
            full_response += event.content
    return full_response


@router.websocket("/ws/{agent_name}")
async def agent_chat_ws(websocket: WebSocket, agent_name: str):
    """WebSocket endpoint for streaming chat."""
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            message = payload.get("message", "")
            session_id = payload.get("session_id", "")
            token = payload.get("token", "")
            mode = payload.get("mode", "ask")

            # Verify token
            from app.services.auth_service import verify_token
            token_data = verify_token(token)
            if not token_data:
                await websocket.send_json({"type": "error", "content": "Unauthorized"})
                continue

            user_id = token_data["sub"]

            async with AsyncSessionLocal() as db:
                # Create or get session
                if session_id:
                    session = await session_proxy.get_session(db, session_id)
                    if not session:
                        await websocket.send_json({"type": "error", "content": "Session not found"})
                        continue
                else:
                    session = await session_proxy.create_session(
                        db, agent_name, user_id,
                        mode=mode, source="playground",
                    )
                    await websocket.send_json({"type": "session", "session_id": session.id})

                # Save user message
                await session_proxy.add_message(db, session.id, "user", message)

                # Get history
                messages = await session_proxy.get_messages(db, session.id)
                history = [{"role": m.role, "content": m.content} for m in messages[:-1]]

                # Build request with mode and native session ID for CLI resumption
                agent_mode = _mode_str_to_enum(mode)
                request = AgentRequest(
                    prompt=message,
                    agent_name=agent_name,
                    session_id=session.native_session_id or "",
                    mode=agent_mode,
                    history=history,
                    context=AgentContext(user_id=user_id),
                )

                # Check if system agent — use adapter directly
                agent_result = await db.execute(
                    select(AgentConfig).where(AgentConfig.name == agent_name)
                )
                agent_config = agent_result.scalar_one_or_none()

                full_response = ""
                native_session_id = None

                if agent_config and agent_config.agent_type == "system":
                    adapter = registry.get(agent_config.preferred_agent)
                    if adapter and await adapter.is_available():
                        full_response, native_session_id = await _stream_adapter(
                            websocket, adapter, request, agent_config.preferred_agent,
                        )
                    else:
                        full_response = await _stream_dispatcher(
                            websocket, db, agent_name, request,
                        )
                else:
                    full_response = await _stream_dispatcher(
                        websocket, db, agent_name, request,
                    )

                if full_response:
                    await session_proxy.add_message(db, session.id, "assistant", full_response)
                if native_session_id:
                    await session_proxy.update_native_session_id(db, session.id, native_session_id)

    except WebSocketDisconnect:
        pass
