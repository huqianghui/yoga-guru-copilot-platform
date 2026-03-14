# Phase D: Full-Stack Infrastructure + Agent Module — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete backend infrastructure (FastAPI + SQLAlchemy + JWT) and Agent/Copilot module, connect the React frontend with real API calls via TanStack Query, and deliver a working end-to-end chat with 5 yoga Copilots.

**Architecture:** Python FastAPI backend with async SQLAlchemy ORM (SQLite for dev), JWT authentication, and a 3-layer Agent system (Yoga Professional → Dispatcher/Failover → CLI Agent adapters). Frontend adds TanStack Query for data fetching, a WebSocket-based Agent Chat Panel, and API client layer. All 5 yoga Copilots are seeded with domain prompts and skills.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy (async), Alembic, Pydantic Settings, JWT (python-jose), React 18, TanStack Query v5, WebSocket, Tailwind CSS v4

---

## File Structure

### Backend (new — `backend/`)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app, CORS, lifespan, router registration
│   ├── config.py                        # Pydantic Settings (env vars)
│   ├── database.py                      # async SQLAlchemy engine + session factory
│   ├── dependencies.py                  # get_db, get_current_user dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                      # UUID + timestamps mixin
│   │   ├── user.py                      # User model (guru / admin)
│   │   ├── agent_config.py              # AgentConfig model (copilot configs)
│   │   ├── agent_session.py             # AgentSession model
│   │   └── agent_message.py             # AgentMessage model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                      # Login/Register/Token schemas
│   │   ├── user.py                      # User response schemas
│   │   └── agent.py                     # Agent request/response schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py                      # POST /auth/login, /auth/register
│   │   ├── users.py                     # GET /users/me
│   │   ├── agents.py                    # Agent CRUD + chat endpoints
│   │   └── dashboard.py                 # GET /dashboard/stats
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py              # password hashing, JWT create/verify
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                  # BaseAgentAdapter ABC + dataclasses
│   │   │   ├── registry.py              # AgentRegistry singleton
│   │   │   ├── session_proxy.py         # Session/message CRUD
│   │   │   ├── context_builder.py       # Yoga context builder
│   │   │   ├── dispatcher.py            # Failover dispatcher
│   │   │   └── adapters/
│   │   │       ├── __init__.py
│   │   │       ├── azure_openai.py      # Azure OpenAI adapter (primary)
│   │   │       ├── claude_code.py       # Claude Code CLI adapter (future)
│   │   │       └── mock.py              # Mock adapter for dev/test
│   │   └── ai_service.py               # Azure OpenAI wrapper (non-agent)
│   └── utils/
│       ├── __init__.py
│       └── exceptions.py               # HTTP exception helpers
├── scripts/
│   ├── init_db.py                       # Create tables
│   └── seed_data.py                     # Seed users + 5 Copilot configs
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── requirements.txt
├── .env.example
└── pytest.ini
```

### Frontend (modifications to existing `src/`)

```
src/
├── api/
│   ├── client.ts                        # axios instance with JWT interceptor
│   ├── auth.ts                          # login/register API calls
│   ├── agents.ts                        # Agent REST + WebSocket API
│   └── dashboard.ts                     # Dashboard stats API
├── hooks/
│   ├── useAuth.ts                       # Auth state + login/logout
│   ├── useAgents.ts                     # TanStack Query hooks for agents
│   └── useDashboard.ts                  # TanStack Query hooks for dashboard
├── stores/
│   └── authStore.ts                     # JWT token + user state (lightweight)
├── types/
│   ├── auth.ts                          # Auth types
│   └── agent.ts                         # Agent types
├── components/
│   ├── agent/
│   │   ├── AgentChatPanel.tsx           # Slide-out chat panel
│   │   ├── AgentChatWidget.tsx          # Chat message list + input
│   │   ├── MessageBubble.tsx            # Markdown message rendering
│   │   └── CopilotSelector.tsx          # Copilot switcher dropdown
│   └── auth/
│       └── LoginForm.tsx                # Login form component
├── pages/
│   ├── Login.tsx                        # Login page
│   └── ... (existing pages — minor modifications)
├── providers/
│   └── QueryProvider.tsx                # TanStack QueryClientProvider
├── components/Layout.tsx                # Add Agent Chat Panel + auth guard
└── routes.tsx                           # Add login route + protected routes
```

---

## Chunk 1: Backend Foundation

### Task 1: Python project scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/.env.example`

- [ ] **Step 1: Create requirements.txt**

```
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy[asyncio]==2.0.35
aiosqlite==0.20.0
alembic==1.13.3
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.2
openai==1.51.0
websockets==13.1
pytest==8.3.3
pytest-asyncio==0.24.0
```

- [ ] **Step 2: Create config.py with Pydantic Settings**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Yoga Guru Copilot Platform"
    debug: bool = True

    # Database
    database_url: str = "sqlite+aiosqlite:///./yoga_guru.db"

    # JWT
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_key: str = ""
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-08-01-preview"

    # Azure Content Understanding (Phase B)
    azure_cu_endpoint: str = ""
    azure_cu_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 3: Create main.py with FastAPI app**

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (dev only — production uses Alembic)
    settings = get_settings()
    if settings.debug:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Yoga Guru Copilot Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def register_routers():
    """Register routers — called after all router modules exist."""
    from app.routers import auth, users, agents, dashboard
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


register_routers()


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 4: Create .env.example**

```
# backend/.env.example
DATABASE_URL=sqlite+aiosqlite:///./yoga_guru.db
JWT_SECRET=change-me-in-production
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_CU_ENDPOINT=
AZURE_CU_KEY=
```

- [ ] **Step 5: Create empty `__init__.py` files**

Create empty `__init__.py` in: `backend/app/`, `backend/app/models/`, `backend/app/schemas/`, `backend/app/routers/`, `backend/app/services/`, `backend/app/services/agents/`, `backend/app/services/agents/adapters/`, `backend/app/utils/`

- [ ] **Step 6: Verify project starts**

```bash
cd backend && pip install -r requirements.txt
# main.py imports will fail until routers exist — that's expected
```

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold FastAPI project with config and main"
```

---

### Task 2: Database layer

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/dependencies.py`

- [ ] **Step 1: Create database.py**

```python
# backend/app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=settings.debug)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 2: Create models/base.py mixin**

```python
# backend/app/models/base.py
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

- [ ] **Step 3: Create models/user.py**

```python
# backend/app/models/user.py
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="guru")  # guru | admin
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
```

- [ ] **Step 4: Create dependencies.py**

```python
# backend/app/dependencies.py
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import verify_token

security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/database.py backend/app/models/ backend/app/dependencies.py
git commit -m "feat(backend): add database layer with User model and dependencies"
```

---

### Task 3: Auth service + router

**Files:**
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/routers/auth.py`
- Create: `backend/app/routers/users.py`

- [ ] **Step 1: Create auth_service.py**

```python
# backend/app/services/auth_service.py
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError

from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str, role: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
```

- [ ] **Step 2: Create schemas/auth.py and schemas/user.py**

```python
# backend/app/schemas/auth.py
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

```python
# backend/app/schemas/user.py
from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    role: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Create routers/auth.py**

```python
# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import hash_password, verify_password, create_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(user.id, user.role)
    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check existing
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

- [ ] **Step 4: Create routers/users.py**

```python
# backend/app/routers/users.py
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user
```

- [ ] **Step 5: Verify server starts**

```bash
cd backend && python -m uvicorn app.main:app --reload --port 8000
# Visit http://localhost:8000/api/health → {"status": "ok"}
# Visit http://localhost:8000/docs → Swagger UI
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/auth_service.py backend/app/schemas/ backend/app/routers/auth.py backend/app/routers/users.py
git commit -m "feat(backend): add JWT auth service and login/register endpoints"
```

---

### Task 4: Agent models + schemas

**Files:**
- Create: `backend/app/models/agent_config.py`
- Create: `backend/app/models/agent_session.py`
- Create: `backend/app/models/agent_message.py`
- Create: `backend/app/schemas/agent.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create agent_config.py**

```python
# backend/app/models/agent_config.py
from sqlalchemy import String, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class AgentConfig(TimestampMixin, Base):
    __tablename__ = "agent_configs"

    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str] = mapped_column(String(10))
    description: Mapped[str] = mapped_column(Text)
    system_prompt: Mapped[str] = mapped_column(Text)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    preferred_agent: Mapped[str] = mapped_column(String(50), default="azure-openai")
    fallback_agents: Mapped[list] = mapped_column(JSON, default=list)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    model_config_json: Mapped[dict] = mapped_column(
        JSON, default=dict, name="model_config"
    )
```

- [ ] **Step 2: Create agent_session.py**

```python
# backend/app/models/agent_session.py
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class AgentSession(TimestampMixin, Base):
    __tablename__ = "agent_sessions"

    agent_name: Mapped[str] = mapped_column(String(50), ForeignKey("agent_configs.name"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200), default="New Chat")

    messages: Mapped[list["AgentMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", lazy="selectin"
    )
```

- [ ] **Step 3: Create agent_message.py**

```python
# backend/app/models/agent_message.py
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class AgentMessage(TimestampMixin, Base):
    __tablename__ = "agent_messages"

    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_sessions.id"))
    role: Mapped[str] = mapped_column(String(20))  # user | assistant | system
    content: Mapped[str] = mapped_column(Text)

    session: Mapped["AgentSession"] = relationship(back_populates="messages")
```

- [ ] **Step 4: Create schemas/agent.py**

```python
# backend/app/schemas/agent.py
from datetime import datetime
from pydantic import BaseModel


class AgentConfigResponse(BaseModel):
    id: str
    name: str
    display_name: str
    icon: str
    description: str
    available: bool
    skills: list[str]
    preferred_agent: str

    model_config = {"from_attributes": True}


class AgentConfigDetail(AgentConfigResponse):
    system_prompt: str
    fallback_agents: list[str]
    model_config_json: dict


class CreateSessionRequest(BaseModel):
    agent_name: str


class SessionResponse(BaseModel):
    id: str
    agent_name: str
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentEventResponse(BaseModel):
    type: str  # text | error | done
    content: str = ""
    session_id: str = ""
```

- [ ] **Step 5: Update models/__init__.py to export all models**

```python
# backend/app/models/__init__.py
from app.models.user import User
from app.models.agent_config import AgentConfig
from app.models.agent_session import AgentSession
from app.models.agent_message import AgentMessage

__all__ = ["User", "AgentConfig", "AgentSession", "AgentMessage"]
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/ backend/app/schemas/agent.py
git commit -m "feat(backend): add Agent models (config, session, message) and schemas"
```

---

### Task 5: Agent service layer (base + registry + dispatcher)

**Files:**
- Create: `backend/app/services/agents/base.py`
- Create: `backend/app/services/agents/registry.py`
- Create: `backend/app/services/agents/session_proxy.py`
- Create: `backend/app/services/agents/context_builder.py`
- Create: `backend/app/services/agents/dispatcher.py`

- [ ] **Step 1: Create base.py — adapter ABC + dataclasses**

```python
# backend/app/services/agents/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator


class AgentMode(str, Enum):
    CHAT = "chat"
    PLAN = "plan"


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
    type: str       # "text", "error", "done"
    content: str = ""


class BaseAgentAdapter(ABC):
    name: str = ""

    @abstractmethod
    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        """Stream agent events for the given request."""
        yield AgentEvent(type="error", content="Not implemented")

    async def is_available(self) -> bool:
        """Check if this agent adapter is currently available."""
        return True
```

- [ ] **Step 2: Create registry.py**

```python
# backend/app/services/agents/registry.py
from app.services.agents.base import BaseAgentAdapter


class AgentRegistry:
    _instance = None
    _adapters: dict[str, BaseAgentAdapter] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._adapters = {}
        return cls._instance

    def register(self, adapter: BaseAgentAdapter) -> None:
        self._adapters[adapter.name] = adapter

    def get(self, name: str) -> BaseAgentAdapter | None:
        return self._adapters.get(name)

    def list_available(self) -> list[str]:
        return list(self._adapters.keys())

    async def check_availability(self, name: str) -> bool:
        adapter = self.get(name)
        if not adapter:
            return False
        return await adapter.is_available()


registry = AgentRegistry()
```

- [ ] **Step 3: Create session_proxy.py**

```python
# backend/app/services/agents/session_proxy.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.agent_session import AgentSession
from app.models.agent_message import AgentMessage


async def create_session(db: AsyncSession, agent_name: str, user_id: str, title: str = "New Chat") -> AgentSession:
    session = AgentSession(agent_name=agent_name, user_id=user_id, title=title)
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
```

- [ ] **Step 4: Create context_builder.py**

```python
# backend/app/services/agents/context_builder.py
from app.services.agents.base import AgentContext


def build_context_prompt(system_prompt: str, context: AgentContext) -> str:
    """Inject yoga module context into the system prompt."""
    parts = [system_prompt]

    if context.module:
        parts.append(f"\n\n---\n当前模块: {context.module}")

    if context.page_data:
        parts.append("当前页面数据:")
        for key, value in context.page_data.items():
            parts.append(f"- {key}: {value}")

    return "\n".join(parts)
```

- [ ] **Step 5: Create dispatcher.py — failover logic**

```python
# backend/app/services/agents/dispatcher.py
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.agent_config import AgentConfig
from app.services.agents.base import AgentRequest, AgentEvent, AgentContext
from app.services.agents.registry import registry
from app.services.agents.context_builder import build_context_prompt


class NoAgentAvailableError(Exception):
    pass


async def dispatch(
    db: AsyncSession,
    agent_name: str,
    request: AgentRequest,
) -> AsyncIterator[AgentEvent]:
    """Dispatch request to the best available agent adapter with failover."""
    # Load copilot config
    result = await db.execute(select(AgentConfig).where(AgentConfig.name == agent_name))
    config = result.scalar_one_or_none()
    if not config:
        yield AgentEvent(type="error", content=f"Copilot '{agent_name}' not found")
        return

    # Build full prompt with context
    full_system_prompt = build_context_prompt(config.system_prompt, request.context)
    request.prompt = request.prompt  # user message stays as-is

    # Try preferred agent, then fallbacks
    agents_to_try = [config.preferred_agent] + (config.fallback_agents or [])

    for adapter_name in agents_to_try:
        adapter = registry.get(adapter_name)
        if adapter and await adapter.is_available():
            # Inject system prompt into request history
            request.history = [
                {"role": "system", "content": full_system_prompt},
                *request.history,
            ]
            async for event in adapter.execute(request):
                yield event
            return

    yield AgentEvent(type="error", content="所有 Agent 均不可用，请稍后重试")
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/agents/
git commit -m "feat(backend): add Agent service layer (base, registry, session, dispatcher)"
```

---

### Task 6: Agent adapters (Azure OpenAI + Mock)

**Files:**
- Create: `backend/app/services/agents/adapters/azure_openai.py`
- Create: `backend/app/services/agents/adapters/mock.py`
- Create: `backend/app/services/agents/adapters/__init__.py`

- [ ] **Step 1: Create Azure OpenAI adapter**

```python
# backend/app/services/agents/adapters/azure_openai.py
from typing import AsyncIterator
from openai import AsyncAzureOpenAI

from app.config import get_settings
from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent


class AzureOpenAIAdapter(BaseAgentAdapter):
    name = "azure-openai"

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        settings = get_settings()
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_key,
            api_version=settings.azure_openai_api_version,
        )

        messages = []
        for msg in request.history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": request.prompt})

        try:
            stream = await client.chat.completions.create(
                model=settings.azure_openai_deployment,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield AgentEvent(type="text", content=chunk.choices[0].delta.content)
            yield AgentEvent(type="done")
        except Exception as e:
            yield AgentEvent(type="error", content=str(e))

    async def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.azure_openai_endpoint and settings.azure_openai_key)
```

- [ ] **Step 2: Create mock adapter for dev/testing**

```python
# backend/app/services/agents/adapters/mock.py
import asyncio
from typing import AsyncIterator

from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent


class MockAgentAdapter(BaseAgentAdapter):
    name = "mock"

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        """Simulate a streaming response for development."""
        response = f"[Mock Copilot] 收到您的消息: \"{request.prompt}\"\n\n"
        response += "这是一个模拟回复。在配置好 Azure OpenAI 后，将使用真实的 AI 回复。\n\n"
        response += "当前上下文:\n"
        if request.context.module:
            response += f"- 模块: {request.context.module}\n"

        # Stream character by character with delay
        for char in response:
            yield AgentEvent(type="text", content=char)
            await asyncio.sleep(0.02)
        yield AgentEvent(type="done")

    async def is_available(self) -> bool:
        return True  # Always available
```

- [ ] **Step 3: Create adapters/__init__.py with registration**

```python
# backend/app/services/agents/adapters/__init__.py
from app.services.agents.registry import registry
from app.services.agents.adapters.azure_openai import AzureOpenAIAdapter
from app.services.agents.adapters.mock import MockAgentAdapter


def register_all_adapters():
    """Register all available agent adapters."""
    registry.register(AzureOpenAIAdapter())
    registry.register(MockAgentAdapter())
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/agents/adapters/
git commit -m "feat(backend): add Azure OpenAI and Mock agent adapters"
```

---

### Task 7: Agent API router (REST + WebSocket)

**Files:**
- Create: `backend/app/routers/agents.py`
- Create: `backend/app/routers/dashboard.py`
- Create: `backend/app/utils/exceptions.py`

- [ ] **Step 1: Create utils/exceptions.py**

```python
# backend/app/utils/exceptions.py
from typing import NoReturn
from fastapi import HTTPException, status


def not_found(detail: str = "Not found") -> NoReturn:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def bad_request(detail: str = "Bad request") -> NoReturn:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
```

- [ ] **Step 2: Create routers/agents.py**

```python
# backend/app/routers/agents.py
import json
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
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
from app.services.agents import session_proxy, dispatcher
from app.services.agents.base import AgentRequest, AgentContext

router = APIRouter()


@router.get("/", response_model=list[AgentConfigResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentConfig).where(AgentConfig.available == True))
    return list(result.scalars().all())


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
```

- [ ] **Step 3: Create routers/dashboard.py**

```python
# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db, get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Dashboard stats — returns counts from each module.
    Placeholder until Phase A/B/C tables exist."""
    return {
        "videos": 0,
        "courses": 0,
        "feedbacks": 0,
        "surveys": 0,
    }
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/ backend/app/utils/
git commit -m "feat(backend): add Agent REST + WebSocket endpoints and dashboard router"
```

---

### Task 8: Seed data script

**Files:**
- Create: `backend/scripts/init_db.py`
- Create: `backend/scripts/seed_data.py`
- Modify: `backend/app/main.py` (register adapters on startup)

- [ ] **Step 1: Create init_db.py**

```python
# backend/scripts/init_db.py
"""Create all database tables. Idempotent — safe to run multiple times."""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app.models import User, AgentConfig, AgentSession, AgentMessage  # noqa: F401


async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")


if __name__ == "__main__":
    asyncio.run(init())
```

- [ ] **Step 2: Create seed_data.py**

```python
# backend/scripts/seed_data.py
"""Seed initial data: admin user + 5 Copilot configs. Idempotent."""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.agent_config import AgentConfig
from app.services.auth_service import hash_password

SEED_USERS = [
    {
        "username": "admin",
        "email": "admin@yogaguru.com",
        "display_name": "管理员",
        "role": "admin",
        "password": "admin123",
    },
    {
        "username": "guru",
        "email": "guru@yogaguru.com",
        "display_name": "瑜伽老师",
        "role": "guru",
        "password": "guru123",
    },
]

YOGA_COPILOTS = [
    {
        "name": "course-planner",
        "display_name": "课程规划助手",
        "icon": "🧘",
        "description": "瑜伽课程编排专家，精通体式序列设计与课程规划",
        "system_prompt": """你是一位资深瑜伽课程编排专家。你精通以下领域：
- 阿斯汤加、流瑜伽、阴瑜伽、哈他瑜伽、艾扬格瑜伽等多种流派
- 体式的安全过渡和力量/柔韧性平衡
- 根据学员水平（初/中/高）调整难度
- 呼吸法(Pranayama)与冥想的融入
- 课程时间分配与节奏把控

当用户请求生成课程序列时，请以JSON格式输出，包含：
{
  "title": "课程标题",
  "duration": "总时长",
  "level": "难度级别",
  "theme": "课程主题",
  "poses": [{"name": "体式名", "duration": "时长", "notes": "教学提示"}]
}

请使用中文回复，保持专业且温暖的语气。""",
        "skills": ["yoga-sequence-generator", "pose-database", "class-template"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "video-analyzer",
        "display_name": "视频分析助手",
        "icon": "🎬",
        "description": "瑜伽教学视频分析专家，擅长授课风格评估与改进建议",
        "system_prompt": """你是一位瑜伽教学视频分析专家。你能够：
- 分析授课风格（动态/静态、流畅度、节奏控制）
- 评估口令引导的清晰度和专业性
- 识别教学亮点和可改进之处
- 分析体式示范的标准度
- 提供具体可操作的改进建议

请基于提供的视频分析数据给出专业意见。使用中文回复。""",
        "skills": ["video-analysis", "frame-extraction", "style-assessment"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "survey-helper",
        "display_name": "问卷管理助手",
        "icon": "📋",
        "description": "学员反馈分析专家，擅长问卷设计与满意度分析",
        "system_prompt": """你是一位学员反馈分析专家。你擅长：
- 根据课程内容生成针对性的问卷问题（通常3-5个问题）
- 分析学员反馈数据，发现趋势和模式
- 生成个性化的回复建议，帮助老师与学员建立连接
- 识别教学改进点
- 满意度数据的统计分析

生成问卷时，请输出JSON格式：
{
  "title": "问卷标题",
  "questions": [{"text": "问题内容", "type": "text|rating|choice"}]
}

请使用中文回复，保持亲切专业的语气。""",
        "skills": ["survey-generator", "feedback-analyzer", "reply-composer"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "content-creator",
        "display_name": "内容创作助手",
        "icon": "✍️",
        "description": "瑜伽自媒体内容专家，擅长朋友圈文案与社交媒体内容",
        "system_prompt": """你是一位瑜伽自媒体内容专家。你擅长：
- 撰写朋友圈文案（轻松愉悦、专业引导、鼓励感恩等风格）
- 根据课堂精彩瞬间生成分享文案
- 编写教学总结与心得分享
- 学员鼓励与互动话术
- 根据品牌调性调整文案风格
- 添加合适的标签和表情

请生成多种风格的文案供选择。使用中文，保持真诚温暖的语气。""",
        "skills": ["caption-writer", "brand-voice", "social-media-optimizer"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
    {
        "name": "yoga-general",
        "display_name": "瑜伽通用助手",
        "icon": "💬",
        "description": "资深瑜伽教学顾问，了解平台所有功能，提供全方位教学支持",
        "system_prompt": """你是一位资深瑜伽教学顾问，也是Yoga Guru Copilot平台的智能助手。你了解：
- 瑜伽哲学、历史和各大流派
- 体式的梵文名称、正位要点、变体和禁忌
- 呼吸法、冥想和瑜伽生活方式
- 教学方法论（口令、辅助、序列编排）
- 瑜伽解剖学基础
- 平台的所有功能模块

你是跨模块问题的统一入口。如果问题属于特定模块（课程规划、视频分析、问卷、内容创作），
请引导用户使用对应的专业Copilot。

请使用中文回复，保持专业且温暖的语气。""",
        "skills": ["yoga-knowledge-base", "teaching-methodology"],
        "preferred_agent": "azure-openai",
        "fallback_agents": ["mock"],
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Seed users
        for user_data in SEED_USERS:
            result = await db.execute(
                select(User).where(User.username == user_data["username"])
            )
            if not result.scalar_one_or_none():
                user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    display_name=user_data["display_name"],
                    role=user_data["role"],
                    hashed_password=hash_password(user_data["password"]),
                )
                db.add(user)
                print(f"  Created user: {user_data['username']}")

        # Seed copilots
        for copilot_data in YOGA_COPILOTS:
            result = await db.execute(
                select(AgentConfig).where(AgentConfig.name == copilot_data["name"])
            )
            if not result.scalar_one_or_none():
                config = AgentConfig(**copilot_data)
                db.add(config)
                print(f"  Created copilot: {copilot_data['display_name']}")

        await db.commit()
    print("Seed data complete.")


if __name__ == "__main__":
    asyncio.run(seed())
```

- [ ] **Step 3: Update main.py to register adapters on startup**

Add to the `lifespan` function in `backend/app/main.py`:

```python
# Inside lifespan(), after table creation:
from app.services.agents.adapters import register_all_adapters
register_all_adapters()
```

- [ ] **Step 4: Test the full backend startup**

```bash
cd backend
python scripts/init_db.py
python scripts/seed_data.py
python -m uvicorn app.main:app --reload --port 8000
# Test: curl http://localhost:8000/api/health
# Test: curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"guru","password":"guru123"}'
```

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/ backend/app/main.py
git commit -m "feat(backend): add init_db and seed_data scripts with 5 Copilot configs"
```

---

## Chunk 2: Frontend Integration

### Task 9: Install frontend dependencies + API client

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `src/api/client.ts`
- Create: `src/types/auth.ts`
- Create: `src/types/agent.ts`
- Create: `src/stores/authStore.ts`

- [ ] **Step 1: Install new dependencies**

```bash
npm install @tanstack/react-query axios react-markdown remark-gfm
```

- [ ] **Step 2: Create API client with JWT interceptor**

```typescript
// src/api/client.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// JWT interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 3: Create type definitions**

```typescript
// src/types/auth.ts
export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: "guru" | "admin";
  avatar_url?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
```

```typescript
// src/types/agent.ts
export interface AgentConfig {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  description: string;
  available: boolean;
  skills: string[];
  preferred_agent: string;
}

export interface AgentSession {
  id: string;
  agent_name: string;
  title: string;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface AgentEvent {
  type: "text" | "error" | "done" | "session";
  content?: string;
  session_id?: string;
}
```

- [ ] **Step 4: Create auth store**

```typescript
// src/stores/authStore.ts
import { User } from "@/types/auth";

let currentUser: User | null = null;
const listeners = new Set<() => void>();

export const authStore = {
  getToken: () => localStorage.getItem("token"),

  setToken: (token: string) => {
    localStorage.setItem("token", token);
    listeners.forEach((fn) => fn());
  },

  clearToken: () => {
    localStorage.removeItem("token");
    currentUser = null;
    listeners.forEach((fn) => fn());
  },

  getUser: () => currentUser,
  setUser: (user: User) => {
    currentUser = user;
    listeners.forEach((fn) => fn());
  },

  isAuthenticated: () => !!localStorage.getItem("token"),

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/api/ src/types/ src/stores/
git commit -m "feat(frontend): add API client, types, auth store, TanStack Query"
```

---

### Task 10: Auth API + hooks + Login page

**Files:**
- Create: `src/api/auth.ts`
- Create: `src/hooks/useAuth.ts`
- Create: `src/components/auth/LoginForm.tsx`
- Create: `src/pages/Login.tsx`
- Create: `src/providers/QueryProvider.tsx`

- [ ] **Step 1: Create auth API**

```typescript
// src/api/auth.ts
import { apiClient } from "./client";
import type { LoginRequest, TokenResponse, User } from "@/types/auth";

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  getMe: () =>
    apiClient.get<User>("/users/me").then((r) => r.data),
};
```

- [ ] **Step 2: Create useAuth hook**

```typescript
// src/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { authStore } from "@/stores/authStore";
import type { LoginRequest } from "@/types/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    enabled: authStore.isAuthenticated(),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      authStore.setToken(data.access_token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });

  const logout = () => {
    authStore.clearToken();
    queryClient.clear();
  };

  return {
    user,
    isLoading,
    isAuthenticated: authStore.isAuthenticated(),
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
}
```

- [ ] **Step 3: Create QueryProvider**

```typescript
// src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Create Login page**

```typescript
// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard, GradientButton, FormField } from "@/components/shared";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn, loginError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      navigate("/");
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            瑜
          </div>
          <h1 className="text-2xl font-bold text-gray-800">瑜伽 Guru Copilot</h1>
          <p className="text-gray-500 mt-1">教学管理平台</p>
        </div>
        <GlassCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              type="input"
              label="用户名"
              placeholder="请输入用户名"
              value={username}
              onChange={setUsername}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 rounded-xl border border-purple-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600">用户名或密码错误</p>
            )}
            <GradientButton type="submit" fullWidth size="lg" disabled={isLoggingIn}>
              {isLoggingIn ? "登录中..." : "登录"}
            </GradientButton>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            测试账号: guru / guru123 | admin / admin123
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/api/auth.ts src/hooks/useAuth.ts src/pages/Login.tsx src/providers/ src/components/auth/
git commit -m "feat(frontend): add auth flow with login page and TanStack Query"
```

---

### Task 11: Agent Chat Panel component

**Files:**
- Create: `src/api/agents.ts`
- Create: `src/hooks/useAgents.ts`
- Create: `src/components/agent/MessageBubble.tsx`
- Create: `src/components/agent/CopilotSelector.tsx`
- Create: `src/components/agent/AgentChatPanel.tsx`

- [ ] **Step 1: Create agents API**

```typescript
// src/api/agents.ts
import { apiClient } from "./client";
import type { AgentConfig, AgentSession, AgentMessage, AgentEvent } from "@/types/agent";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000/api";

export const agentsApi = {
  list: () =>
    apiClient.get<AgentConfig[]>("/agents/").then((r) => r.data),

  getConfig: (name: string) =>
    apiClient.get<AgentConfig>(`/agents/${name}`).then((r) => r.data),

  listSessions: (agentName?: string) =>
    apiClient
      .get<AgentSession[]>("/agents/sessions/list", { params: { agent_name: agentName } })
      .then((r) => r.data),

  getMessages: (sessionId: string) =>
    apiClient.get<AgentMessage[]>(`/agents/sessions/${sessionId}/messages`).then((r) => r.data),

  createSession: (agentName: string) =>
    apiClient.post<AgentSession>("/agents/sessions", { agent_name: agentName }).then((r) => r.data),
};

export class AgentWebSocket {
  private ws: WebSocket | null = null;
  private onEvent: (event: AgentEvent) => void;

  constructor(agentName: string, onEvent: (event: AgentEvent) => void) {
    this.onEvent = onEvent;
    const token = localStorage.getItem("token");
    this.ws = new WebSocket(`${WS_BASE}/agents/ws/${agentName}`);

    this.ws.onopen = () => {
      // Connection ready
    };

    this.ws.onmessage = (e) => {
      const event: AgentEvent = JSON.parse(e.data);
      this.onEvent(event);
    };

    this.ws.onerror = () => {
      this.onEvent({ type: "error", content: "WebSocket connection error" });
    };
  }

  send(message: string, sessionId?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const token = localStorage.getItem("token");
      this.ws.send(JSON.stringify({ message, session_id: sessionId, token }));
    }
  }

  close() {
    this.ws?.close();
  }
}
```

- [ ] **Step 2: Create useAgents hook**

```typescript
// src/hooks/useAgents.ts
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/api/agents";

export function useAgentList() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });
}

export function useAgentSessions(agentName?: string) {
  return useQuery({
    queryKey: ["agent-sessions", agentName],
    queryFn: () => agentsApi.listSessions(agentName),
  });
}

export function useAgentMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["agent-messages", sessionId],
    queryFn: () => agentsApi.getMessages(sessionId!),
    enabled: !!sessionId,
  });
}
```

- [ ] **Step 3: Create MessageBubble component**

```typescript
// src/components/agent/MessageBubble.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-gradient-to-r from-purple-500 to-green-500 text-white"
            : "bg-white/80 backdrop-blur-sm border border-purple-100/50 text-gray-800"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {isStreaming && <span className="animate-pulse">▊</span>}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CopilotSelector component**

```typescript
// src/components/agent/CopilotSelector.tsx
import { cn } from "@/lib/utils";
import type { AgentConfig } from "@/types/agent";

interface CopilotSelectorProps {
  agents: AgentConfig[];
  selected: string;
  onSelect: (name: string) => void;
}

export function CopilotSelector({ agents, selected, onSelect }: CopilotSelectorProps) {
  return (
    <div className="flex gap-1 overflow-x-auto p-1">
      {agents.map((agent) => (
        <button
          key={agent.name}
          onClick={() => onSelect(agent.name)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer",
            selected === agent.name
              ? "bg-gradient-to-r from-purple-500 to-green-500 text-white shadow-md"
              : "bg-white/60 text-gray-600 hover:bg-purple-100/50"
          )}
        >
          <span>{agent.icon}</span>
          <span>{agent.display_name}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create AgentChatPanel component**

```typescript
// src/components/agent/AgentChatPanel.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentList } from "@/hooks/useAgents";
import { AgentWebSocket } from "@/api/agents";
import { MessageBubble } from "./MessageBubble";
import { CopilotSelector } from "./CopilotSelector";
import type { AgentEvent, AgentMessage } from "@/types/agent";

export function AgentChatPanel() {
  const [open, setOpen] = useState(false);
  const [agentName, setAgentName] = useState("yoga-general");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const wsRef = useRef<AgentWebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agents = [] } = useAgentList();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "session":
        setSessionId(event.session_id || null);
        break;
      case "text":
        setStreamContent((prev) => prev + (event.content || ""));
        break;
      case "done":
        setStreaming(false);
        setStreamContent((prev) => {
          if (prev) {
            setMessages((msgs) => [...msgs, {
              id: Date.now().toString(),
              role: "assistant",
              content: prev,
              created_at: new Date().toISOString(),
            }]);
          }
          return "";
        });
        break;
      case "error":
        setStreaming(false);
        setStreamContent("");
        setMessages((msgs) => [...msgs, {
          id: Date.now().toString(),
          role: "assistant",
          content: `Error: ${event.content}`,
          created_at: new Date().toISOString(),
        }]);
        break;
    }
  }, []);

  const connectWs = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = new AgentWebSocket(agentName, handleEvent);
  }, [agentName, handleEvent]);

  useEffect(() => {
    if (open) {
      connectWs();
    }
    return () => wsRef.current?.close();
  }, [open, connectWs]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamContent("");
    wsRef.current?.send(input.trim(), sessionId || undefined);
    setInput("");
  };

  const handleAgentSwitch = (name: string) => {
    setAgentName(name);
    setMessages([]);
    setSessionId(null);
    setStreamContent("");
  };

  const currentAgent = agents.find((a) => a.name === agentName);

  return (
    <>
      {/* Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-green-500 text-white shadow-xl hover:shadow-2xl transition-all flex items-center justify-center z-50 cursor-pointer"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-0 right-0 w-96 h-[600px] bg-white/95 backdrop-blur-xl border-l border-t border-purple-200/50 shadow-2xl flex flex-col z-50 rounded-tl-2xl">
          {/* Header */}
          <div className="px-4 py-3 border-b border-purple-200/50 bg-gradient-to-r from-purple-50/80 to-green-50/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentAgent?.icon || "💬"}</span>
                <span className="font-semibold text-gray-800 text-sm">{currentAgent?.display_name || "Copilot"}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                  <Minimize2 className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-red-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <CopilotSelector agents={agents} selected={agentName} onSelect={handleAgentSwitch} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="text-center text-gray-400 mt-8">
                <p className="text-sm">向 {currentAgent?.display_name} 提问</p>
                <p className="text-xs mt-1">{currentAgent?.description}</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role as "user" | "assistant"} content={msg.content} />
            ))}
            {streaming && streamContent && (
              <MessageBubble role="assistant" content={streamContent} isStreaming />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-purple-200/50">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-purple-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                disabled={streaming}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className={cn(
                  "p-2.5 rounded-xl transition-all cursor-pointer",
                  input.trim() && !streaming
                    ? "bg-gradient-to-r from-purple-500 to-green-500 text-white shadow-md hover:shadow-lg"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/api/agents.ts src/hooks/useAgents.ts src/components/agent/
git commit -m "feat(frontend): add Agent Chat Panel with WebSocket streaming"
```

---

### Task 12: Wire everything together (routes, layout, app entry)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/routes.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Update App.tsx to wrap with QueryProvider**

```typescript
// src/App.tsx
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { QueryProvider } from "./providers/QueryProvider";

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
```

- [ ] **Step 2: Update routes.tsx to add login route**

```typescript
// src/routes.tsx
import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import VideoAnalysis from "./pages/VideoAnalysis";
import CoursePlanning from "./pages/CoursePlanning";
import QuestionnaireManagement from "./pages/QuestionnaireManagement";
import PhotoProcessing from "./pages/PhotoProcessing";
import Login from "./pages/Login";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "video-analysis", Component: VideoAnalysis },
      { path: "course-planning", Component: CoursePlanning },
      { path: "questionnaire", Component: QuestionnaireManagement },
      { path: "photo-processing", Component: PhotoProcessing },
    ],
  },
]);
```

- [ ] **Step 3: Update Layout.tsx to add AgentChatPanel + auth guard**

Add these imports at the top of `src/components/Layout.tsx`:

```typescript
import { Navigate } from "react-router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
```

Add auth guard at the start of the Layout function body:

```typescript
export function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  // ... existing state

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // ... rest of component
```

Add `<AgentChatPanel />` right after `<Outlet />` inside the main content area:

```tsx
<Outlet />
<AgentChatPanel />
```

Add a logout button at the bottom of the sidebar (before the closing `</nav>` or at the end of the sidebar):

```tsx
<button
  onClick={logout}
  className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white transition-colors"
>
  <LogOut className="w-5 h-5" />
  {!collapsed && <span>退出登录</span>}
</button>
```

- [ ] **Step 4: Verify end-to-end flow**

```bash
# Terminal 1: Start backend
cd backend && python scripts/init_db.py && python scripts/seed_data.py && python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
npm run dev

# Test flow:
# 1. Visit http://localhost:5173 → redirects to /login
# 2. Login with guru/guru123
# 3. Dashboard loads with real layout
# 4. Click chat bubble → Agent Chat Panel opens
# 5. Select a Copilot, type a message → gets streamed response (mock or Azure)
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/routes.tsx src/components/Layout.tsx
git commit -m "feat: wire auth, routes, and Agent Chat Panel into main app"
```

---

### Task 13: Alembic setup

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/` (directory)

- [ ] **Step 1: Initialize Alembic**

```bash
cd backend && alembic init alembic
```

- [ ] **Step 2: Configure alembic/env.py for async**

Replace the generated `backend/alembic/env.py` with:

```python
# backend/alembic/env.py
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Import Base and all models so metadata includes all tables
from app.database import Base
from app.models.user import User  # noqa: F401
from app.models.agent_config import AgentConfig  # noqa: F401
from app.models.agent_session import AgentSession  # noqa: F401
from app.models.agent_message import AgentMessage  # noqa: F401
from app.config import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = get_settings().database_url
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    settings = get_settings()
    connectable = create_async_engine(settings.database_url, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Update alembic.ini with database URL**

In `backend/alembic.ini`, change the `sqlalchemy.url` line to:

```ini
# Leave blank — we read URL from app.config in env.py
sqlalchemy.url =
```

- [ ] **Step 4: Generate initial migration**

```bash
cd backend && alembic revision --autogenerate -m "initial tables"
```

- [ ] **Step 5: Apply migration**

```bash
cd backend && alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat(backend): add Alembic migration setup with initial tables"
```

---

### Task 14: Vite proxy + environment config

**Files:**
- Modify: `vite.config.ts`
- Create: `.env.development`

- [ ] **Step 1: Add proxy to vite.config.ts**

```typescript
// vite.config.ts — add server.proxy
export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/api/agents/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 2: Update API client to use relative URLs when proxied**

In `src/api/client.ts`, change `API_BASE` to use `/api` (relative) since Vite proxy handles it:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "/api";
```

In `src/api/agents.ts`, update `WS_BASE` to use the Vite proxy (relative WebSocket URL):

```typescript
const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/api`;
```

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts src/api/client.ts
git commit -m "feat: add Vite proxy for API requests and environment config"
```

---

## Chunk 3: Integration Testing + Polish

### Task 15: Backend smoke test

**Files:**
- Create: `backend/tests/test_health.py`
- Create: `backend/tests/test_auth.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/pytest.ini`

- [ ] **Step 1: Create pytest.ini**

```ini
# backend/pytest.ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 2: Create conftest.py with test DB**

```python
# backend/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.database import Base
from app.main import app
from app.dependencies import get_db

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
```

- [ ] **Step 3: Create test_health.py**

```python
# backend/tests/test_health.py
import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 4: Create test_auth.py**

```python
# backend/tests/test_auth.py
import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    # Register
    resp = await client.post("/api/auth/register", json={
        "username": "testguru",
        "email": "test@yoga.com",
        "password": "test123",
        "display_name": "Test Guru",
    })
    assert resp.status_code == 201
    assert resp.json()["username"] == "testguru"

    # Login
    resp = await client.post("/api/auth/login", json={
        "username": "testguru",
        "password": "test123",
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    assert token

    # Get me
    resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Test Guru"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    # Register first
    await client.post("/api/auth/register", json={
        "username": "testguru2",
        "email": "test2@yoga.com",
        "password": "correct",
        "display_name": "Test",
    })

    resp = await client.post("/api/auth/login", json={
        "username": "testguru2",
        "password": "wrong",
    })
    assert resp.status_code == 401
```

- [ ] **Step 5: Run tests**

```bash
cd backend && python -m pytest tests/ -v
# Expected: All tests PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/tests/ backend/pytest.ini
git commit -m "test(backend): add smoke tests for health check and auth endpoints"
```

---

### Task 16: Final integration verification

- [ ] **Step 1: Full restart and test**

```bash
# Clean restart
cd backend
rm -f yoga_guru.db
python scripts/init_db.py
python scripts/seed_data.py
python -m uvicorn app.main:app --reload --port 8000
```

In another terminal:
```bash
npm run dev
```

- [ ] **Step 2: Manual verification checklist**

1. Login page renders at `/login`
2. Login with `guru` / `guru123` succeeds
3. Dashboard page loads (still with mock data — real data comes in Phase A)
4. Agent Chat Panel button appears (bottom-right)
5. Chat Panel opens, shows 5 Copilots
6. Selecting a Copilot and sending a message gets a response (mock or Azure)
7. Messages stream in real-time
8. Sidebar navigation works for all 5 pages
9. Logout works and redirects to login

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase D complete — full-stack infrastructure with Agent/Copilot module"
```

---

## Summary

Phase D delivers:
- **Backend**: FastAPI app with JWT auth, async SQLAlchemy, 5 database tables, CORS, Alembic migrations
- **Agent System**: 3-layer architecture with base adapter, registry, failover dispatcher, Azure OpenAI + mock adapters
- **5 Yoga Copilots**: Seeded with domain-specific system prompts and skill configurations
- **Frontend**: TanStack Query integration, API client with JWT, Login page, Agent Chat Panel with WebSocket streaming
- **Testing**: Backend smoke tests for auth flow
- **Dev Experience**: Vite proxy, seed scripts, `.env` config
