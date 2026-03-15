# System Agents & Skills Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add System/Tools Agent management (Claude Code, Codex, Copilot, OpenCode) and a full Skills CRUD system with agent-skill assignment.

**Architecture:** Extend `agent_configs` table with `agent_type` discriminator to support "system" agents alongside existing "copilot" agents. Create new `skills` table and `agent_skills` junction table. Add Skills management page and enhance Agent management page with type-aware tabs and skill assignment UI.

**Tech Stack:** Python FastAPI + SQLAlchemy (async) + Alembic / React 18 + TypeScript + TanStack Query + Tailwind CSS v4

---

## Chunk 1: Backend Data Models & Migrations

### Task 1: Skill Model

**Files:**
- Create: `backend/app/models/skill.py`
- Modify: `backend/app/models/__init__.py`
- Test: `backend/tests/test_models_skill.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_models_skill.py
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.database import AsyncSessionLocal
from app.models.skill import Skill


@pytest.mark.asyncio
async def test_skill_model_create():
    """Skill model can be created and persisted."""
    async with AsyncSessionLocal() as db:
        skill = Skill(
            name="yoga-sequence-generator",
            display_name="Yoga Sequence Generator",
            description="Generate yoga sequences based on level and duration",
            skill_type="managed",
            category="yoga",
            content="You are a yoga sequence planning assistant...",
            available=True,
        )
        db.add(skill)
        await db.commit()
        await db.refresh(skill)

        assert skill.id is not None
        assert skill.name == "yoga-sequence-generator"
        assert skill.skill_type == "managed"
        assert skill.available is True
        assert skill.created_at is not None

        # Cleanup
        await db.delete(skill)
        await db.commit()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_models_skill.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.models.skill'"

- [ ] **Step 3: Create the Skill model**

```python
# backend/app/models/skill.py
from sqlalchemy import String, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Skill(TimestampMixin, Base):
    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    skill_type: Mapped[str] = mapped_column(String(20), default="managed")
    # skill_type: "bundled" | "managed" | "workspace"
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    content: Mapped[str] = mapped_column(Text, default="")
    input_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
```

- [ ] **Step 4: Register Skill in models/__init__.py**

Add to `backend/app/models/__init__.py`:

```python
from app.models.skill import Skill  # noqa: F401
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_models_skill.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/skill.py backend/app/models/__init__.py backend/tests/test_models_skill.py
git commit -m "feat: add Skill model"
```

---

### Task 2: AgentSkill Junction Table

**Files:**
- Create: `backend/app/models/agent_skill.py`
- Modify: `backend/app/models/__init__.py`
- Test: `backend/tests/test_models_agent_skill.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_models_agent_skill.py
import pytest
from app.database import AsyncSessionLocal
from app.models.agent_skill import AgentSkill


@pytest.mark.asyncio
async def test_agent_skill_model_create():
    """AgentSkill junction record can be created."""
    async with AsyncSessionLocal() as db:
        link = AgentSkill(
            agent_name="claude-code",
            skill_id="test-skill-id-placeholder",
        )
        db.add(link)
        await db.commit()
        await db.refresh(link)

        assert link.id is not None
        assert link.agent_name == "claude-code"
        assert link.created_at is not None

        # Cleanup
        await db.delete(link)
        await db.commit()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_models_agent_skill.py -v`
Expected: FAIL with "ModuleNotFoundError"

- [ ] **Step 3: Create the AgentSkill model**

```python
# backend/app/models/agent_skill.py
from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class AgentSkill(TimestampMixin, Base):
    __tablename__ = "agent_skills"
    __table_args__ = (
        UniqueConstraint("agent_name", "skill_id", name="uq_agent_skill"),
    )

    agent_name: Mapped[str] = mapped_column(String(50), index=True)
    skill_id: Mapped[str] = mapped_column(String(36), index=True)
```

- [ ] **Step 4: Register in models/__init__.py**

Add to `backend/app/models/__init__.py`:

```python
from app.models.agent_skill import AgentSkill  # noqa: F401
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_models_agent_skill.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/agent_skill.py backend/app/models/__init__.py backend/tests/test_models_agent_skill.py
git commit -m "feat: add AgentSkill junction model"
```

---

### Task 3: Extend AgentConfig for System Agents

**Files:**
- Modify: `backend/app/models/agent_config.py`
- Test: `backend/tests/test_models_agent_config_ext.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_models_agent_config_ext.py
import pytest
from app.database import AsyncSessionLocal
from app.models.agent_config import AgentConfig


@pytest.mark.asyncio
async def test_agent_config_system_type():
    """AgentConfig supports agent_type='system' with new fields."""
    async with AsyncSessionLocal() as db:
        agent = AgentConfig(
            name="test-claude-code",
            display_name="Claude Code",
            icon="🤖",
            description="Anthropic Claude Code CLI",
            system_prompt="",
            agent_type="system",
            modes=["plan", "ask", "code"],
            version="1.0.0",
            provider="Anthropic",
            model_name="claude-sonnet-4",
            install_hint="npm install -g @anthropic-ai/claude-code",
            tools=["Read", "Write", "Bash", "Grep"],
            mcp_servers=[],
        )
        db.add(agent)
        await db.commit()
        await db.refresh(agent)

        assert agent.agent_type == "system"
        assert agent.modes == ["plan", "ask", "code"]
        assert agent.version == "1.0.0"
        assert agent.provider == "Anthropic"

        # Cleanup
        await db.delete(agent)
        await db.commit()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_models_agent_config_ext.py -v`
Expected: FAIL with "TypeError: unexpected keyword argument 'agent_type'"

- [ ] **Step 3: Add system agent fields to AgentConfig**

Modify `backend/app/models/agent_config.py`:

```python
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

    # === System Agent fields (Task 3) ===
    agent_type: Mapped[str] = mapped_column(String(20), default="copilot")
    # agent_type: "copilot" (LLM chat) | "system" (CLI tool)
    modes: Mapped[list | None] = mapped_column(JSON, nullable=True)
    version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    install_hint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tools: Mapped[list | None] = mapped_column(JSON, nullable=True)
    mcp_servers: Mapped[list | None] = mapped_column(JSON, nullable=True)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_models_agent_config_ext.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/agent_config.py backend/tests/test_models_agent_config_ext.py
git commit -m "feat: extend AgentConfig with system agent fields"
```

---

### Task 4: Alembic Migration

**Files:**
- Create: `backend/alembic/versions/<auto>_add_skills_and_system_agents.py`

- [ ] **Step 1: Generate migration**

```bash
cd backend && alembic revision --autogenerate -m "add skills table, agent_skills table, system agent fields"
```

- [ ] **Step 2: Review the generated migration**

Verify it contains:
- `create_table('skills', ...)` with all columns
- `create_table('agent_skills', ...)` with unique constraint
- `add_column('agent_configs', 'agent_type', ...)` and other new columns

- [ ] **Step 3: Run migration**

```bash
cd backend && alembic upgrade head
```
Expected: No errors

- [ ] **Step 4: Run all existing tests to verify no regressions**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/
git commit -m "feat: alembic migration for skills and system agent fields"
```

---

## Chunk 2: Backend Skills CRUD

### Task 5: Skill Schemas

**Files:**
- Create: `backend/app/schemas/skill.py`
- Test: (tested via API in Task 7)

- [ ] **Step 1: Create Skill schemas**

```python
# backend/app/schemas/skill.py
from datetime import datetime
from pydantic import BaseModel


class SkillCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    skill_type: str = "managed"
    category: str | None = None
    content: str = ""
    input_schema: dict | None = None
    available: bool = True


class SkillUpdate(BaseModel):
    display_name: str | None = None
    description: str | None = None
    skill_type: str | None = None
    category: str | None = None
    content: str | None = None
    input_schema: dict | None = None
    available: bool | None = None


class SkillResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: str
    skill_type: str
    category: str | None
    content: str
    input_schema: dict | None
    available: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SkillBriefResponse(BaseModel):
    """Lightweight response for list views."""
    id: str
    name: str
    display_name: str
    description: str
    skill_type: str
    category: str | None
    available: bool

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/skill.py
git commit -m "feat: add Skill pydantic schemas"
```

---

### Task 6: Skill Service

**Files:**
- Create: `backend/app/services/skill_service.py`
- Test: `backend/tests/test_skill_service.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_skill_service.py
import pytest
from app.database import AsyncSessionLocal
from app.services.skill_service import SkillService
from app.schemas.skill import SkillCreate, SkillUpdate


@pytest.mark.asyncio
async def test_skill_crud():
    """SkillService supports full CRUD lifecycle."""
    async with AsyncSessionLocal() as db:
        svc = SkillService(db)

        # Create
        created = await svc.create(SkillCreate(
            name="test-skill-crud",
            display_name="Test Skill",
            description="For testing",
            skill_type="managed",
            content="Test content",
        ))
        assert created.name == "test-skill-crud"
        assert created.id is not None

        # Get
        fetched = await svc.get_by_id(created.id)
        assert fetched is not None
        assert fetched.name == "test-skill-crud"

        # List
        skills = await svc.list_all()
        assert any(s.name == "test-skill-crud" for s in skills)

        # Update
        updated = await svc.update(created.id, SkillUpdate(display_name="Updated Name"))
        assert updated.display_name == "Updated Name"

        # Delete
        await svc.delete(created.id)
        gone = await svc.get_by_id(created.id)
        assert gone is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_skill_service.py -v`
Expected: FAIL with "ModuleNotFoundError"

- [ ] **Step 3: Implement SkillService**

```python
# backend/app/services/skill_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate


class SkillService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(
        self,
        skill_type: str | None = None,
        category: str | None = None,
        search: str | None = None,
    ) -> list[Skill]:
        stmt = select(Skill).order_by(Skill.name)
        if skill_type:
            stmt = stmt.where(Skill.skill_type == skill_type)
        if category:
            stmt = stmt.where(Skill.category == category)
        if search:
            stmt = stmt.where(Skill.name.ilike(f"%{search}%"))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, skill_id: str) -> Skill | None:
        stmt = select(Skill).where(Skill.id == skill_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Skill | None:
        stmt = select(Skill).where(Skill.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: SkillCreate) -> Skill:
        skill = Skill(**data.model_dump())
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def update(self, skill_id: str, data: SkillUpdate) -> Skill | None:
        skill = await self.get_by_id(skill_id)
        if not skill:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(skill, key, value)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def delete(self, skill_id: str) -> bool:
        skill = await self.get_by_id(skill_id)
        if not skill:
            return False
        await self.db.delete(skill)
        await self.db.commit()
        return True
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_skill_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/skill_service.py backend/tests/test_skill_service.py
git commit -m "feat: add SkillService with full CRUD"
```

---

### Task 7: Skills Router

**Files:**
- Create: `backend/app/routers/skills.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_skills_api.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_skills_api.py
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_skills_crud_api():
    """Skills REST API supports full CRUD."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login as admin
        login_resp = await client.post("/api/auth/login", json={
            "username": "admin", "password": "admin123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create
        resp = await client.post("/api/skills", json={
            "name": "test-api-skill",
            "display_name": "Test API Skill",
            "description": "Created via API test",
            "skill_type": "managed",
            "content": "Test skill content",
        }, headers=headers)
        assert resp.status_code == 201
        skill = resp.json()
        skill_id = skill["id"]
        assert skill["name"] == "test-api-skill"

        # List
        resp = await client.get("/api/skills", headers=headers)
        assert resp.status_code == 200
        skills = resp.json()
        assert any(s["name"] == "test-api-skill" for s in skills)

        # Get
        resp = await client.get(f"/api/skills/{skill_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "test-api-skill"

        # Update
        resp = await client.patch(f"/api/skills/{skill_id}", json={
            "display_name": "Updated Skill Name",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["display_name"] == "Updated Skill Name"

        # Delete
        resp = await client.delete(f"/api/skills/{skill_id}", headers=headers)
        assert resp.status_code == 204

        # Verify deleted
        resp = await client.get(f"/api/skills/{skill_id}", headers=headers)
        assert resp.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_skills_api.py -v`
Expected: FAIL with 404 (no /api/skills route)

- [ ] **Step 3: Implement Skills router**

```python
# backend/app/routers/skills.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_201_CREATED, HTTP_204_NO_CONTENT

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.routers.admin import require_admin
from app.services.skill_service import SkillService
from app.schemas.skill import (
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    SkillBriefResponse,
)

router = APIRouter(tags=["skills"])


@router.get("", response_model=list[SkillBriefResponse])
async def list_skills(
    skill_type: str | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    svc = SkillService(db)
    return await svc.list_all(skill_type=skill_type, category=category, search=search)


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    svc = SkillService(db)
    skill = await svc.get_by_id(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.post("", response_model=SkillResponse, status_code=HTTP_201_CREATED)
async def create_skill(
    body: SkillCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = SkillService(db)
    existing = await svc.get_by_name(body.name)
    if existing:
        raise HTTPException(status_code=409, detail="Skill name already exists")
    return await svc.create(body)


@router.patch("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: str,
    body: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = SkillService(db)
    updated = await svc.update(skill_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Skill not found")
    return updated


@router.delete("/{skill_id}", status_code=HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = SkillService(db)
    deleted = await svc.delete(skill_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Skill not found")
```

- [ ] **Step 4: Register router in main.py**

In `backend/app/main.py`, update the `register_routers()` function — add `skills` to the existing import line and register the router:

```python
# In register_routers(), add 'skills' to the import:
from app.routers import auth, users, agents, dashboard, courses, surveys, videos, health, admin, skills
# Then add this line after the other router registrations:
app.include_router(skills.router, prefix="/api/skills", tags=["skills"])
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_skills_api.py -v`
Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/skills.py backend/app/main.py backend/tests/test_skills_api.py
git commit -m "feat: add Skills REST API with CRUD endpoints"
```

---

## Chunk 3: Backend System Agents & Skill Assignment

### Task 8: Extended Agent Schemas

**Files:**
- Modify: `backend/app/schemas/agent.py`
- Modify: `backend/app/schemas/agent_config.py`

- [ ] **Step 1: Update agent schemas to include system agent fields**

Add system agent fields to `backend/app/schemas/agent.py` — update `AgentConfigResponse` (keep `id` field!):

```python
class AgentConfigResponse(BaseModel):
    id: str
    name: str
    display_name: str
    icon: str
    description: str
    available: bool
    skills: list[str]
    preferred_agent: str
    agent_type: str = "copilot"
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None

    model_config = {"from_attributes": True}
```

Update `backend/app/schemas/agent_config.py` — add system fields to all schemas (keep `id` and `protected_namespaces`!):

```python
class AgentConfigAdminResponse(BaseModel):
    """Full admin response with all fields + timestamps."""

    model_config = {"from_attributes": True, "protected_namespaces": ()}

    id: str
    name: str
    display_name: str
    icon: str
    description: str
    system_prompt: str
    skills: list[str]
    preferred_agent: str
    fallback_agents: list[str]
    available: bool
    model_config_json: dict
    agent_type: str = "copilot"
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None
    tools: list | None = None
    mcp_servers: list | None = None
    created_at: datetime
    updated_at: datetime


class AgentConfigCreate(BaseModel):
    """Schema for creating a new agent configuration."""

    name: str
    display_name: str
    icon: str = "\U0001f916"
    description: str = ""
    system_prompt: str = ""
    skills: list[str] = []
    preferred_agent: str = "azure-openai"
    fallback_agents: list[str] = ["mock"]
    available: bool = True
    model_config_json: dict = {}
    # System agent fields (optional)
    agent_type: str = "copilot"
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None
    tools: list | None = None
    mcp_servers: list | None = None


class AgentConfigUpdate(BaseModel):
    """Schema for partial updates to an agent configuration."""

    display_name: str | None = None
    icon: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    skills: list[str] | None = None
    preferred_agent: str | None = None
    fallback_agents: list[str] | None = None
    available: bool | None = None
    model_config_json: dict | None = None
    # System agent fields (optional)
    agent_type: str | None = None
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None
    tools: list | None = None
    mcp_servers: list | None = None
```

- [ ] **Step 2: Run tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/agent.py backend/app/schemas/agent_config.py
git commit -m "feat: extend agent schemas with system agent fields"
```

---

### Task 9: Agent-Skill Assignment API

**Files:**
- Modify: `backend/app/routers/agents.py`
- Create: `backend/app/services/agent_skill_service.py`
- Test: `backend/tests/test_agent_skill_api.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_agent_skill_api.py
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_agent_skill_assignment():
    """Agent-Skill assignment API works end-to-end."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login as admin
        login_resp = await client.post("/api/auth/login", json={
            "username": "admin", "password": "admin123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create a test skill
        skill_resp = await client.post("/api/skills", json={
            "name": "test-assign-skill",
            "display_name": "Assign Test Skill",
            "skill_type": "managed",
            "content": "Test",
        }, headers=headers)
        skill_id = skill_resp.json()["id"]

        # Assign skill to agent (course-planner is seeded)
        resp = await client.post(
            "/api/agents/course-planner/skills",
            json={"skill_id": skill_id},
            headers=headers,
        )
        assert resp.status_code == 201

        # List agent's skills
        resp = await client.get(
            "/api/agents/course-planner/skills",
            headers=headers,
        )
        assert resp.status_code == 200
        assigned = resp.json()
        assert any(s["id"] == skill_id for s in assigned)

        # Remove skill from agent
        resp = await client.delete(
            f"/api/agents/course-planner/skills/{skill_id}",
            headers=headers,
        )
        assert resp.status_code == 204

        # Cleanup test skill
        await client.delete(f"/api/skills/{skill_id}", headers=headers)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_agent_skill_api.py -v`
Expected: FAIL with 404/405 (no skill assignment endpoints)

- [ ] **Step 3: Implement AgentSkillService**

```python
# backend/app/services/agent_skill_service.py
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_skill import AgentSkill
from app.models.skill import Skill


class AgentSkillService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_skills_for_agent(self, agent_name: str) -> list[Skill]:
        stmt = (
            select(Skill)
            .join(AgentSkill, AgentSkill.skill_id == Skill.id)
            .where(AgentSkill.agent_name == agent_name)
            .order_by(Skill.name)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def assign_skill(self, agent_name: str, skill_id: str) -> AgentSkill:
        link = AgentSkill(agent_name=agent_name, skill_id=skill_id)
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def remove_skill(self, agent_name: str, skill_id: str) -> bool:
        stmt = (
            sa_delete(AgentSkill)
            .where(AgentSkill.agent_name == agent_name)
            .where(AgentSkill.skill_id == skill_id)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0
```

- [ ] **Step 4: Add skill assignment endpoints to agents router**

First, add a typed request schema to `backend/app/schemas/skill.py`:

```python
class SkillAssignRequest(BaseModel):
    skill_id: str
```

Then add to `backend/app/routers/agents.py` — add these imports at the top:

```python
from app.services.agent_skill_service import AgentSkillService
from app.schemas.skill import SkillBriefResponse, SkillAssignRequest
```

Add these endpoints AFTER the `delete_agent_config` endpoint (line ~103) and BEFORE the `get_agent_detail` `/{agent_name}` endpoint (line ~116), to avoid route conflicts:

```python
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_agent_skill_api.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/agent_skill_service.py backend/app/routers/agents.py backend/tests/test_agent_skill_api.py
git commit -m "feat: add agent-skill assignment API"
```

---

### Task 10: Seed System Agents + Default Skills

**Files:**
- Modify: `backend/app/services/startup.py`
- Test: `backend/tests/test_seed_system_agents.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_seed_system_agents.py
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_system_agents_seeded():
    """System agents are seeded on startup."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_resp = await client.post("/api/auth/login", json={
            "username": "admin", "password": "admin123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/agents/", headers=headers)
        agents = resp.json()

        system_agents = [a for a in agents if a.get("agent_type") == "system"]
        assert len(system_agents) >= 3

        names = [a["name"] for a in system_agents]
        assert "claude-code" in names
        assert "codex-cli" in names
        assert "github-copilot" in names


@pytest.mark.asyncio
async def test_default_skills_seeded():
    """Default skills are seeded on startup."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login_resp = await client.post("/api/auth/login", json={
            "username": "admin", "password": "admin123"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/skills", headers=headers)
        skills = resp.json()
        assert len(skills) >= 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_seed_system_agents.py -v`
Expected: FAIL (no system agents / skills seeded)

- [ ] **Step 3: Add system agents and default skills to startup.py**

Add to `backend/app/services/startup.py` — new seed functions:

```python
# Add these lists after YOGA_COPILOTS in startup.py
# Add 'from app.models.skill import Skill' at the top of the file alongside existing imports

SYSTEM_AGENTS = [
    {
        "name": "claude-code",
        "display_name": "Claude Code",
        "icon": "🟣",
        "description": "Anthropic's agentic coding tool — plan, code, debug via CLI",
        "system_prompt": "",
        "agent_type": "system",
        "preferred_agent": "mock",
        "modes": ["plan", "ask", "code"],
        "provider": "Anthropic",
        "model_name": "claude-sonnet-4",
        "install_hint": "npm install -g @anthropic-ai/claude-code",
        "tools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "Agent"],
        "mcp_servers": [],
        "available": True,
    },
    {
        "name": "codex-cli",
        "display_name": "Codex CLI",
        "icon": "🟢",
        "description": "OpenAI's open-source coding agent — lightweight CLI for code tasks",
        "system_prompt": "",
        "agent_type": "system",
        "preferred_agent": "mock",
        "modes": ["ask", "code"],
        "provider": "OpenAI",
        "model_name": "o4-mini",
        "install_hint": "npm install -g @openai/codex",
        "tools": ["shell", "file_read", "file_write", "file_edit"],
        "mcp_servers": [],
        "available": True,
    },
    {
        "name": "github-copilot",
        "display_name": "GitHub Copilot",
        "icon": "🔵",
        "description": "GitHub's AI pair programmer — code completion and chat",
        "system_prompt": "",
        "agent_type": "system",
        "preferred_agent": "mock",
        "modes": ["ask", "code"],
        "provider": "GitHub / Microsoft",
        "model_name": "gpt-4o",
        "install_hint": "gh extension install github/gh-copilot",
        "tools": ["code-completion", "code-review", "test-generation"],
        "mcp_servers": [],
        "available": True,
    },
    {
        "name": "opencode",
        "display_name": "OpenCode",
        "icon": "🟠",
        "description": "Open-source terminal-based AI coding assistant",
        "system_prompt": "",
        "agent_type": "system",
        "preferred_agent": "mock",
        "modes": ["ask", "code"],
        "provider": "Community",
        "model_name": "configurable",
        "install_hint": "go install github.com/opencode-ai/opencode@latest",
        "tools": ["file", "shell", "browser"],
        "mcp_servers": [],
        "available": True,
    },
]

DEFAULT_SKILLS = [
    {
        "name": "yoga-sequence-generator",
        "display_name": "Yoga Sequence Generator",
        "description": "Generate yoga class sequences based on level, duration, and focus area",
        "skill_type": "bundled",
        "category": "yoga",
        "content": "You are a yoga sequence planning expert. Given a class level, duration, and focus area, generate a structured sequence of poses with timing and transitions.",
    },
    {
        "name": "pose-database",
        "display_name": "Pose Database Lookup",
        "description": "Look up yoga poses with Sanskrit names, benefits, and contraindications",
        "skill_type": "bundled",
        "category": "yoga",
        "content": "You have access to a comprehensive yoga pose database. Help users find poses by name, category, or body area, providing Sanskrit names, benefits, modifications, and contraindications.",
    },
    {
        "name": "video-analysis",
        "display_name": "Teaching Video Analysis",
        "description": "Analyze teaching videos for style, rhythm, and guidance quality",
        "skill_type": "bundled",
        "category": "video",
        "content": "Analyze yoga teaching videos to extract teaching style, rhythm patterns, guidance methods, and core philosophy.",
    },
    {
        "name": "survey-generator",
        "display_name": "Survey Generator",
        "description": "Generate student feedback surveys with appropriate question types",
        "skill_type": "bundled",
        "category": "survey",
        "content": "Generate student feedback surveys for yoga classes, including rating scales, open-ended questions, and satisfaction metrics.",
    },
    {
        "name": "code-review",
        "display_name": "Code Review",
        "description": "Review code for quality, security, and best practices",
        "skill_type": "managed",
        "category": "development",
        "content": "Review code changes for quality, security vulnerabilities, performance issues, and adherence to best practices. Provide constructive feedback with specific suggestions.",
    },
    {
        "name": "test-generation",
        "display_name": "Test Generation",
        "description": "Generate unit and integration tests for code",
        "skill_type": "managed",
        "category": "development",
        "content": "Generate comprehensive test cases including unit tests, integration tests, and edge cases. Follow TDD principles and project testing conventions.",
    },
    {
        "name": "documentation-writer",
        "display_name": "Documentation Writer",
        "description": "Generate and update project documentation",
        "skill_type": "managed",
        "category": "development",
        "content": "Write and update documentation including API docs, user guides, and inline code comments. Follow the project's documentation standards.",
    },
    {
        "name": "caption-writer",
        "display_name": "Caption Writer",
        "description": "Write social media captions with brand voice for yoga content",
        "skill_type": "bundled",
        "category": "content",
        "content": "Write engaging social media captions for yoga photos and videos, maintaining brand voice and optimizing for engagement.",
    },
]


async def _seed_system_agents(db: AsyncSession) -> None:
    """Seed system/tools agents if not exist. Does NOT commit — caller commits."""
    for agent_data in SYSTEM_AGENTS:
        result = await db.execute(
            select(AgentConfig).where(AgentConfig.name == agent_data["name"])
        )
        if not result.scalar_one_or_none():
            db.add(AgentConfig(**agent_data))
            logger.info("Created system agent: %s", agent_data["display_name"])


async def _seed_default_skills(db: AsyncSession) -> None:
    """Seed default skills if not exist. Does NOT commit — caller commits."""
    for skill_data in DEFAULT_SKILLS:
        result = await db.execute(
            select(Skill).where(Skill.name == skill_data["name"])
        )
        if not result.scalar_one_or_none():
            db.add(Skill(**skill_data, available=True))
            logger.info("Created skill: %s", skill_data["display_name"])
```

Then update `seed_initial_data()` to call the new functions (before the existing `await db.commit()`):

```python
async def seed_initial_data():
    """Seed default users, copilots, system agents, and skills. Skips existing records."""
    async with AsyncSessionLocal() as db:
        await _seed_users(db)
        await _seed_copilots(db)
        await _seed_system_agents(db)
        await _seed_default_skills(db)
        await db.commit()
    logger.info("Seed data check complete.")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_seed_system_agents.py -v`
Expected: PASS

- [ ] **Step 5: Run all backend tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/startup.py backend/tests/test_seed_system_agents.py
git commit -m "feat: seed system agents and default skills on startup"
```

---

## Chunk 4: Frontend Types & API Client

### Task 11: Frontend Types for Skills and System Agents

**Files:**
- Create: `frontend/src/types/skill.ts`
- Modify: `frontend/src/types/agent.ts`

- [ ] **Step 1: Create Skill types**

```typescript
// frontend/src/types/skill.ts
export interface Skill {
  id: string;
  name: string;
  display_name: string;
  description: string;
  skill_type: "bundled" | "managed" | "workspace";
  category: string | null;
  available: boolean;
}

export interface SkillDetail extends Skill {
  content: string;
  input_schema: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  name: string;
  display_name: string;
  description?: string;
  skill_type?: string;
  category?: string;
  content?: string;
  input_schema?: Record<string, unknown>;
  available?: boolean;
}

export interface SkillUpdate {
  display_name?: string;
  description?: string;
  skill_type?: string;
  category?: string;
  content?: string;
  input_schema?: Record<string, unknown>;
  available?: boolean;
}
```

- [ ] **Step 2: Extend agent types**

Add to `frontend/src/types/agent.ts`:

```typescript
// Add to AgentConfig interface
export interface AgentConfig {
  name: string;
  display_name: string;
  icon: string;
  description: string;
  skills: string[];
  preferred_agent: string;
  available: boolean;
  agent_type: "copilot" | "system";
  modes?: string[];
  version?: string;
  provider?: string;
  model_name?: string;
  install_hint?: string;
}

// Add to AgentConfigAdmin interface
export interface AgentConfigAdmin extends AgentConfig {
  system_prompt: string;
  fallback_agents: string[];
  model_config_json: Record<string, unknown>;
  tools?: string[];
  mcp_servers?: string[];
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/skill.ts frontend/src/types/agent.ts
git commit -m "feat: add frontend types for Skills and system agents"
```

---

### Task 12: Skills API Client + React Query Hooks

**Files:**
- Create: `frontend/src/api/skills.ts`
- Create: `frontend/src/hooks/useSkills.ts`

- [ ] **Step 1: Create Skills API client**

```typescript
// frontend/src/api/skills.ts
import { apiClient } from "./client";
import type { Skill, SkillDetail, SkillCreate, SkillUpdate } from "@/types/skill";

export const skillsApi = {
  list: (params?: { skill_type?: string; category?: string; search?: string }) =>
    apiClient.get<Skill[]>("/skills", { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<SkillDetail>(`/skills/${id}`).then((r) => r.data),

  create: (body: SkillCreate) =>
    apiClient.post<SkillDetail>("/skills", body).then((r) => r.data),

  update: (id: string, body: SkillUpdate) =>
    apiClient.patch<SkillDetail>(`/skills/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/skills/${id}`),

  // Agent-skill assignment
  listForAgent: (agentName: string) =>
    apiClient.get<Skill[]>(`/agents/${agentName}/skills`).then((r) => r.data),

  assignToAgent: (agentName: string, skillId: string) =>
    apiClient.post(`/agents/${agentName}/skills`, { skill_id: skillId }).then((r) => r.data),

  removeFromAgent: (agentName: string, skillId: string) =>
    apiClient.delete(`/agents/${agentName}/skills/${skillId}`),
};
```

- [ ] **Step 2: Create React Query hooks**

```typescript
// frontend/src/hooks/useSkills.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skillsApi } from "@/api/skills";
import type { SkillCreate, SkillUpdate } from "@/types/skill";

export function useSkillList(params?: {
  skill_type?: string;
  category?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["skills", params],
    queryFn: () => skillsApi.list(params),
  });
}

export function useSkillDetail(id: string | null) {
  return useQuery({
    queryKey: ["skills", id],
    queryFn: () => skillsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SkillCreate) => skillsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SkillUpdate }) =>
      skillsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useAgentSkills(agentName: string | null) {
  return useQuery({
    queryKey: ["agent-skills", agentName],
    queryFn: () => skillsApi.listForAgent(agentName!),
    enabled: !!agentName,
  });
}

export function useAssignSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentName, skillId }: { agentName: string; skillId: string }) =>
      skillsApi.assignToAgent(agentName, skillId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-skills"] }),
  });
}

export function useRemoveSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentName, skillId }: { agentName: string; skillId: string }) =>
      skillsApi.removeFromAgent(agentName, skillId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-skills"] }),
  });
}
```

- [ ] **Step 3: TypeScript type check**

Run: `cd frontend && npx tsc -b`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/skills.ts frontend/src/hooks/useSkills.ts
git commit -m "feat: add Skills API client and React Query hooks"
```

---

## Chunk 5: Frontend Skills Management Page

### Task 13: Skills Management Page

**Files:**
- Create: `frontend/src/pages/AdminSkills.tsx`

- [ ] **Step 1: Create the Skills management page**

```tsx
// frontend/src/pages/AdminSkills.tsx
import { useState } from "react";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  Settings2,
  FolderOpen,
} from "lucide-react";
import {
  PageHeader,
  GlassCard,
  GradientButton,
  SectionTitle,
  Badge,
  InfoBox,
} from "@/components/shared";
import {
  useSkillList,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
} from "@/hooks/useSkills";
import type { SkillCreate, SkillUpdate } from "@/types/skill";

const SKILL_TYPE_ICONS: Record<string, typeof Package> = {
  bundled: Package,
  managed: Settings2,
  workspace: FolderOpen,
};

const SKILL_TYPE_LABELS: Record<string, string> = {
  bundled: "内置",
  managed: "托管",
  workspace: "工作区",
};

const emptyForm: SkillCreate = {
  name: "",
  display_name: "",
  description: "",
  skill_type: "managed",
  category: "",
  content: "",
};

export default function AdminSkills() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [formData, setFormData] = useState<SkillCreate>({ ...emptyForm });
  const [editData, setEditData] = useState<SkillUpdate>({});

  const { data: skills, isLoading, refetch } = useSkillList({
    skill_type: filterType || undefined,
    search: search || undefined,
  });
  const createMutation = useCreateSkill();
  const updateMutation = useUpdateSkill();
  const deleteMutation = useDeleteSkill();

  const handleCreate = async () => {
    await createMutation.mutateAsync(formData);
    setShowCreate(false);
    setFormData({ ...emptyForm });
  };

  const handleUpdate = async (id: string) => {
    await updateMutation.mutateAsync({ id, body: editData });
    setEditingSkill(null);
    setEditData({});
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除 Skill "${name}" 吗？`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const shownCount = skills?.length ?? 0;

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Skills 管理"
        description="管理 Skill 可用性，分配给 Agent 使用"
      />

      <GlassCard padding="lg">
        <div className="flex items-center justify-between">
          <SectionTitle>Skills</SectionTitle>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <GradientButton size="sm" onClick={() => setShowCreate(!showCreate)}>
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                创建 Skill
              </span>
            </GradientButton>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-1">
          Bundled, managed, and workspace skills.
        </p>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-gray-500">Filter</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:border-purple-400"
            >
              <option value="">全部类型</option>
              <option value="bundled">内置 (Bundled)</option>
              <option value="managed">托管 (Managed)</option>
              <option value="workspace">工作区 (Workspace)</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search skills"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:border-purple-400 w-64"
            />
          </div>

          <span className="text-sm text-gray-500">{shownCount} shown</span>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 border border-purple-200/30 space-y-4">
            <h4 className="font-semibold text-gray-800">创建新 Skill</h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="名称标识 (英文, 如 code-review)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              />
              <input
                placeholder="显示名称"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              />
            </div>
            <input
              placeholder="描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.skill_type}
                onChange={(e) => setFormData({ ...formData, skill_type: e.target.value })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="managed">托管 (Managed)</option>
                <option value="bundled">内置 (Bundled)</option>
                <option value="workspace">工作区 (Workspace)</option>
              </select>
              <input
                placeholder="分类 (如 yoga, development)"
                value={formData.category ?? ""}
                onChange={(e) => setFormData({ ...formData, category: e.target.value || undefined })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              />
            </div>
            <textarea
              placeholder="Skill 内容 / Prompt 模板"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm font-mono"
            />
            <div className="flex gap-2">
              <GradientButton
                onClick={handleCreate}
                disabled={!formData.name || !formData.display_name || createMutation.isPending}
              >
                {createMutation.isPending ? "创建中..." : "创建"}
              </GradientButton>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Skill List */}
        <div className="space-y-3 mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : skills && skills.length > 0 ? (
            skills.map((skill) => {
              const TypeIcon = SKILL_TYPE_ICONS[skill.skill_type] ?? Zap;
              return (
                <div
                  key={skill.id}
                  className="p-4 rounded-xl bg-white/50 border border-purple-100/30 hover:border-purple-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-green-100 flex items-center justify-center">
                        <TypeIcon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {skill.display_name}
                        </h4>
                        <p className="text-xs text-gray-500">{skill.name}</p>
                      </div>
                      <Badge variant={skill.available ? "gradient" : "outline"}>
                        {skill.available ? "可用" : "禁用"}
                      </Badge>
                      <Badge variant="purple">
                        {SKILL_TYPE_LABELS[skill.skill_type] ?? skill.skill_type}
                      </Badge>
                      {skill.category && (
                        <Badge variant="outline">{skill.category}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedSkill(
                            expandedSkill === skill.id ? null : skill.id
                          )
                        }
                        className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        {expandedSkill === skill.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSkill(skill.id);
                          setExpandedSkill(skill.id);
                          setEditData({});
                        }}
                        className="p-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(skill.id, skill.name)}
                        className="p-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {skill.description && (
                    <p className="text-sm text-gray-600 mt-2 ml-11">
                      {skill.description}
                    </p>
                  )}

                  {/* Expanded Detail / Edit */}
                  {expandedSkill === skill.id && (
                    <div className="mt-4 ml-11 space-y-3 p-4 rounded-xl bg-purple-50/30 border border-purple-100/20">
                      {editingSkill === skill.id ? (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              显示名称
                            </label>
                            <input
                              value={editData.display_name ?? skill.display_name}
                              onChange={(e) =>
                                setEditData({ ...editData, display_name: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              描述
                            </label>
                            <input
                              value={editData.description ?? skill.description}
                              onChange={(e) =>
                                setEditData({ ...editData, description: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500 block mb-1">
                                类型
                              </label>
                              <select
                                value={editData.skill_type ?? skill.skill_type}
                                onChange={(e) =>
                                  setEditData({ ...editData, skill_type: e.target.value })
                                }
                                className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                              >
                                <option value="managed">托管</option>
                                <option value="bundled">内置</option>
                                <option value="workspace">工作区</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 block mb-1">
                                分类
                              </label>
                              <input
                                value={editData.category ?? skill.category ?? ""}
                                onChange={(e) =>
                                  setEditData({ ...editData, category: e.target.value || undefined })
                                }
                                className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 block mb-1">
                              Skill 内容
                            </label>
                            <textarea
                              value={editData.content ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, content: e.target.value })
                              }
                              rows={4}
                              className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm font-mono"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <GradientButton
                              size="sm"
                              onClick={() => handleUpdate(skill.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? "保存中..." : "保存"}
                            </GradientButton>
                            <button
                              onClick={() => {
                                setEditingSkill(null);
                                setEditData({});
                              }}
                              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs font-medium text-gray-500">类型</label>
                            <p className="text-sm">{SKILL_TYPE_LABELS[skill.skill_type]}</p>
                          </div>
                          {skill.category && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">分类</label>
                              <p className="text-sm">{skill.category}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-3 text-purple-400" />
              <p>No skills found.</p>
            </div>
          )}
        </div>
      </GlassCard>

      <InfoBox variant="tip" title="Skills 说明">
        <ul className="space-y-1">
          <li>- <strong>内置 (Bundled)</strong>: 平台预置的核心 Skill</li>
          <li>- <strong>托管 (Managed)</strong>: 管理员创建的 Skill</li>
          <li>- <strong>工作区 (Workspace)</strong>: 项目级别的自定义 Skill</li>
          <li>- Skill 可以分配给 System Agent 使用</li>
        </ul>
      </InfoBox>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript type check**

Run: `cd frontend && npx tsc -b`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AdminSkills.tsx
git commit -m "feat: add Skills management page"
```

---

## Chunk 6: Frontend Agent Enhancement & Navigation

### Task 14: Enhanced AdminAgents with Agent Type Tabs

**Files:**
- Modify: `frontend/src/pages/AdminAgents.tsx`

- [ ] **Step 1: Update AdminAgents page with type tabs and skill assignment**

Key changes to `frontend/src/pages/AdminAgents.tsx`:

**1. Add imports:**
```typescript
import { Zap, Terminal } from "lucide-react";  // add to existing lucide import
import { cn } from "@/lib/utils";
import {
  useAgentSkills,
  useAssignSkill,
  useRemoveSkill,
  useSkillList,
} from "@/hooks/useSkills";
```

**2. Add tab state after existing state declarations:**
```typescript
const [activeTab, setActiveTab] = useState<"copilot" | "system">("copilot");
```

**3. Filter agents by type (after the `useAdapters` call):**
```typescript
const filteredAgents = agents?.filter(
  (a) => (a.agent_type ?? "copilot") === activeTab
);
```

**4. Add tab bar before the Agent List card:**
```tsx
{/* Agent Type Tabs */}
<div className="flex gap-2 mb-6">
  <button
    onClick={() => setActiveTab("copilot")}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer",
      activeTab === "copilot"
        ? "bg-gradient-to-r from-purple-400 to-green-400 text-white border-transparent shadow-md"
        : "bg-white/50 border-purple-200 text-gray-700 hover:bg-purple-50"
    )}
  >
    <Bot className="w-4 h-4" /> Copilot 助手
  </button>
  <button
    onClick={() => setActiveTab("system")}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer",
      activeTab === "system"
        ? "bg-gradient-to-r from-purple-400 to-green-400 text-white border-transparent shadow-md"
        : "bg-white/50 border-purple-200 text-gray-700 hover:bg-purple-50"
    )}
  >
    <Terminal className="w-4 h-4" /> System Agent
  </button>
</div>
```

**5. In the expanded detail section, add system agent fields (after the Skills section):**
```tsx
{/* System Agent specific fields */}
{agent.agent_type === "system" && (
  <>
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1">提供商</label>
      <Badge variant="purple">{agent.provider ?? "Unknown"}</Badge>
    </div>
    {agent.version && (
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">版本</label>
        <span className="text-sm">{agent.version}</span>
      </div>
    )}
    {agent.modes && (
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">模式</label>
        <div className="flex flex-wrap gap-2">
          {agent.modes.map((mode) => (
            <Badge key={mode} variant="outline">{mode}</Badge>
          ))}
        </div>
      </div>
    )}
    {agent.install_hint && (
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">安装指引</label>
        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{agent.install_hint}</code>
      </div>
    )}
  </>
)}
```

**6. Add a Skill assignment section in the expanded detail (for both types):**

Create a sub-component or inline section using `useAgentSkills(expandedAgent)`, `useSkillList()`, `useAssignSkill()`, `useRemoveSkill()`. Show:
- Currently assigned skills as removable badges
- A dropdown to add unassigned skills with a "+" button

```tsx
{/* Assigned Skills (real, from junction table) */}
<div>
  <label className="text-xs font-medium text-gray-500 block mb-1">已分配 Skills</label>
  <AgentSkillAssignment agentName={agent.name} />
</div>
```

Where `AgentSkillAssignment` is a helper component defined in the same file:

```tsx
function AgentSkillAssignment({ agentName }: { agentName: string }) {
  const { data: assigned } = useAgentSkills(agentName);
  const { data: allSkills } = useSkillList();
  const assignMut = useAssignSkill();
  const removeMut = useRemoveSkill();

  const unassigned = allSkills?.filter(
    (s) => !assigned?.some((a) => a.id === s.id)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {assigned?.map((skill) => (
          <span key={skill.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-sm">
            <Zap className="w-3 h-3 text-purple-600" />
            {skill.display_name}
            <button
              onClick={() => removeMut.mutate({ agentName, skillId: skill.id })}
              className="ml-1 text-red-400 hover:text-red-600 cursor-pointer"
            >×</button>
          </span>
        ))}
        {(!assigned || assigned.length === 0) && (
          <span className="text-xs text-gray-400">暂无已分配 Skill</span>
        )}
      </div>
      {unassigned && unassigned.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) {
              assignMut.mutate({ agentName, skillId: e.target.value });
              e.target.value = "";
            }
          }}
          className="px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
          defaultValue=""
        >
          <option value="" disabled>+ 添加 Skill</option>
          {unassigned.map((s) => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
```

**7. Use `filteredAgents` instead of `agents` in the list rendering.**

Replace `agents.map((agent) => (` with `filteredAgents.map((agent) => (` and update the empty state check accordingly.

- [ ] **Step 2: TypeScript type check**

Run: `cd frontend && npx tsc -b`
Expected: No errors

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AdminAgents.tsx
git commit -m "feat: enhance AdminAgents with agent type tabs and skill assignment"
```

---

### Task 15: Navigation + Routing

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/routes.tsx`

- [ ] **Step 1: Add Skills page to navigation**

Update `frontend/src/components/Layout.tsx`:

Add `Zap` to lucide imports:
```typescript
import { Video, Calendar, FileQuestion, Image, LayoutDashboard, Menu, LogOut, Settings, Bot, Zap } from "lucide-react";
```

Add skills nav item (after "Agent 管理"):
```typescript
const navItems = [
  { path: "/", label: "仪表板", icon: LayoutDashboard },
  { path: "/video-analysis", label: "视频分析", icon: Video },
  { path: "/course-planning", label: "课程规划", icon: Calendar },
  { path: "/questionnaire", label: "问卷管理", icon: FileQuestion },
  { path: "/photo-processing", label: "照片处理", icon: Image },
  { path: "/admin/settings", label: "系统配置", icon: Settings },
  { path: "/admin/agents", label: "Agent 管理", icon: Bot },
  { path: "/admin/skills", label: "Skills 管理", icon: Zap },
];
```

- [ ] **Step 2: Add route**

Update `frontend/src/routes.tsx`:

Add import:
```typescript
import AdminSkills from "./pages/AdminSkills";
```

Add route (after admin/agents):
```typescript
{ path: "admin/skills", Component: AdminSkills },
```

- [ ] **Step 3: TypeScript check + Build**

Run: `cd frontend && npx tsc -b && npm run build`
Expected: Both pass with no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout.tsx frontend/src/routes.tsx
git commit -m "feat: add Skills page to navigation and routing"
```

---

### Task 16: Final Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: All pass

- [ ] **Step 2: Run frontend build**

```bash
cd frontend && npx tsc -b && npm run build
```
Expected: Both pass

- [ ] **Step 3: Manual smoke test**

Start backend and frontend:
```bash
# Terminal 1
cd backend && python -m uvicorn app.main:app --reload --port 8000
# Terminal 2
cd frontend && npm run dev
```

Verify:
1. Login as admin
2. Navigate to "Agent 管理" — see Copilot and System Agent tabs
3. Switch to "System Agent" tab — see Claude Code, Codex, Copilot, OpenCode
4. Navigate to "Skills 管理" — see 8 seeded skills with search and filter
5. Create a new skill, edit it, delete it
6. Go back to Agent detail → assign a skill, verify it shows, remove it

- [ ] **Step 4: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
