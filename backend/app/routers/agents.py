import json
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
from app.services.agents.base import AgentRequest, AgentContext
from app.services.agents.registry import registry
from app.services.agent_skill_service import AgentSkillService
from app.schemas.skill import SkillBriefResponse, SkillAssignRequest
from app.routers.admin import require_admin

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
    session = await session_proxy.create_session(db, body.agent_name, user.id)
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
    # Create or get session
    if body.session_id:
        session = await session_proxy.get_session(db, body.session_id)
    else:
        session = await session_proxy.create_session(db, "yoga-general", user.id)

    # Save user message
    await session_proxy.add_message(db, session.id, "user", body.message)

    # Get history
    messages = await session_proxy.get_messages(db, session.id)
    history = [{"role": m.role, "content": m.content} for m in messages[:-1]]

    # Dispatch
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

    # Save assistant message
    await session_proxy.add_message(db, session.id, "assistant", full_response)

    return AgentEventResponse(type="done", content=full_response, session_id=session.id)


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
                else:
                    session = await session_proxy.create_session(db, agent_name, user_id)
                    await websocket.send_json({"type": "session", "session_id": session.id})

                # Save user message
                await session_proxy.add_message(db, session.id, "user", message)

                # Get history
                messages = await session_proxy.get_messages(db, session.id)
                history = [{"role": m.role, "content": m.content} for m in messages[:-1]]

                # Dispatch with streaming
                request = AgentRequest(
                    prompt=message,
                    agent_name=agent_name,
                    history=history,
                    context=AgentContext(user_id=user_id),
                )

                full_response = ""
                async for event in dispatcher.dispatch(db, agent_name, request):
                    await websocket.send_json({"type": event.type, "content": event.content})
                    if event.type == "text":
                        full_response += event.content

                # Save assistant response
                if full_response:
                    await session_proxy.add_message(db, session.id, "assistant", full_response)

    except WebSocketDisconnect:
        pass
