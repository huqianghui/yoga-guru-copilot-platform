from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.agent_session import AgentSession
from app.models.agent_message import AgentMessage


async def create_session(
    db: AsyncSession,
    agent_name: str,
    user_id: str,
    title: str = "New Chat",
    mode: str = "ask",
    source: str = "playground",
) -> AgentSession:
    session = AgentSession(
        agent_name=agent_name,
        user_id=user_id,
        title=title,
        mode=mode,
        source=source,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: str) -> AgentSession | None:
    result = await db.execute(select(AgentSession).where(AgentSession.id == session_id))
    return result.scalar_one_or_none()


async def list_sessions(db: AsyncSession, user_id: str, agent_name: str | None = None) -> list[AgentSession]:
    stmt = select(AgentSession).where(AgentSession.user_id == user_id)
    if agent_name:
        stmt = stmt.where(AgentSession.agent_name == agent_name)
    stmt = stmt.order_by(AgentSession.updated_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def add_message(db: AsyncSession, session_id: str, role: str, content: str) -> AgentMessage:
    msg = AgentMessage(session_id=session_id, role=role, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_messages(db: AsyncSession, session_id: str) -> list[AgentMessage]:
    result = await db.execute(
        select(AgentMessage)
        .where(AgentMessage.session_id == session_id)
        .order_by(AgentMessage.created_at.asc())
    )
    return list(result.scalars().all())


async def update_native_session_id(db: AsyncSession, session_id: str, native_session_id: str):
    session = await get_session(db, session_id)
    if session:
        session.native_session_id = native_session_id
        await db.commit()


async def delete_session(db: AsyncSession, session_id: str, user_id: str | None = None) -> bool:
    session = await get_session(db, session_id)
    if not session:
        return False
    if user_id and session.user_id != user_id:
        return False
    await db.delete(session)
    await db.commit()
    return True
