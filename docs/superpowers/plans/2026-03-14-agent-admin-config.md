# Agent 管理配置模块 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Agent 系统暴露给管理员配置，支持多 AI 后端（Azure OpenAI / Anthropic Claude / OpenAI），管理员可配置每个 Agent 的 system prompt、skills、首选/备选适配器。

**Architecture:** 在现有 AgentConfig 模型基础上，增加完整的 CRUD API（POST/PUT/DELETE），新增 Anthropic Claude 和 OpenAI 原生适配器，创建管理员 Agent 配置页面，支持配置 system prompt、skills 元数据、模型参数。

**Tech Stack:** FastAPI, SQLAlchemy, Anthropic SDK, OpenAI SDK, React + TanStack Query

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/app/services/agents/adapters/anthropic_claude.py` | Anthropic Claude 适配器 |
| Create | `backend/app/services/agents/adapters/openai_native.py` | OpenAI 原生适配器 |
| Modify | `backend/app/services/agents/adapters/__init__.py` | 注册新适配器 |
| Modify | `backend/app/config.py` | 增加 Anthropic/OpenAI 配置 |
| Modify | `backend/.env.example` | 增加新环境变量 |
| Modify | `backend/requirements.txt` | 增加 anthropic SDK |
| Create | `backend/app/schemas/agent_config.py` | Agent 配置 schemas |
| Modify | `backend/app/routers/agents.py` | 增加 CRUD endpoints |
| Create | `backend/tests/test_agent_admin.py` | Agent 管理测试 |
| Create | `frontend/src/pages/AdminAgents.tsx` | Agent 管理页面 |
| Modify | `frontend/src/routes.tsx` | 添加路由 |
| Create | `frontend/e2e/admin-agents.spec.ts` | E2E 测试 |

---

## Chunk 1: New AI Adapters

### Task 1: Anthropic Claude Adapter

**Files:**
- Create: `backend/app/services/agents/adapters/anthropic_claude.py`
- Modify: `backend/app/config.py`
- Modify: `backend/requirements.txt`
- Modify: `backend/.env.example`

- [ ] **Step 1: Add Anthropic SDK dependency**

Add to `backend/requirements.txt`:

```
anthropic==0.42.0
```

- [ ] **Step 2: Install dependency**

```bash
cd backend && pip install anthropic==0.42.0
```

- [ ] **Step 3: Add config settings**

Add to `backend/app/config.py` Settings class:

```python
    # Anthropic Claude
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # OpenAI (direct, non-Azure)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
```

- [ ] **Step 4: Update .env.example**

Add to `backend/.env.example`:

```
# Anthropic Claude
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# OpenAI (direct, non-Azure)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
```

- [ ] **Step 5: Create Anthropic adapter**

```python
# backend/app/services/agents/adapters/anthropic_claude.py
"""Anthropic Claude adapter for agent system."""
import logging
from typing import AsyncIterator

from app.config import get_settings
from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent

logger = logging.getLogger(__name__)


class AnthropicClaudeAdapter(BaseAgentAdapter):
    """Adapter for Anthropic Claude API (Claude Code / Claude Sonnet/Opus)."""

    name = "anthropic-claude"

    def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.anthropic_api_key)

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        settings = get_settings()
        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=settings.anthropic_api_key)

            # Build messages from history
            messages = []
            system_prompt = ""
            for msg in request.history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "system":
                    system_prompt = content
                else:
                    messages.append({"role": role, "content": content})

            # Add current user message
            messages.append({"role": "user", "content": request.prompt})

            async with client.messages.stream(
                model=settings.anthropic_model,
                max_tokens=4096,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    yield AgentEvent(type="text", content=text)

            yield AgentEvent(type="done", content="")

        except Exception as e:
            logger.error(f"Anthropic Claude error: {e}")
            yield AgentEvent(type="error", content=f"Claude API 错误: {str(e)[:200]}")
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/agents/adapters/anthropic_claude.py backend/app/config.py backend/requirements.txt backend/.env.example
git commit -m "feat(backend): add Anthropic Claude adapter for agent system"
```

---

### Task 2: OpenAI Native Adapter

**Files:**
- Create: `backend/app/services/agents/adapters/openai_native.py`
- Modify: `backend/app/services/agents/adapters/__init__.py`

- [ ] **Step 1: Create OpenAI native adapter**

```python
# backend/app/services/agents/adapters/openai_native.py
"""OpenAI native (non-Azure) adapter for agent system."""
import logging
from typing import AsyncIterator

from app.config import get_settings
from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent

logger = logging.getLogger(__name__)


class OpenAINativeAdapter(BaseAgentAdapter):
    """Adapter for OpenAI API directly (Codex / GPT-4o / o1)."""

    name = "openai"

    def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.openai_api_key)

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        settings = get_settings()
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key)

            # Build messages from history
            messages = []
            for msg in request.history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })

            # Add current user message
            messages.append({"role": "user", "content": request.prompt})

            stream = await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield AgentEvent(type="text", content=chunk.choices[0].delta.content)

            yield AgentEvent(type="done", content="")

        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            yield AgentEvent(type="error", content=f"OpenAI API 错误: {str(e)[:200]}")
```

- [ ] **Step 2: Register all adapters**

Update `backend/app/services/agents/adapters/__init__.py`:

```python
from app.services.agents.registry import registry
from app.services.agents.adapters.azure_openai import AzureOpenAIAdapter
from app.services.agents.adapters.anthropic_claude import AnthropicClaudeAdapter
from app.services.agents.adapters.openai_native import OpenAINativeAdapter
from app.services.agents.adapters.mock import MockAgentAdapter


def register_all_adapters():
    """Register all available agent adapters."""
    registry.register(AzureOpenAIAdapter())
    registry.register(AnthropicClaudeAdapter())
    registry.register(OpenAINativeAdapter())
    registry.register(MockAgentAdapter())
```

- [ ] **Step 3: Run backend tests**

```bash
cd backend && python3 -m pytest tests/ -v
```
Expected: ALL PASS (new adapters are not used unless credentials are set)

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/agents/adapters/
git commit -m "feat(backend): add OpenAI native adapter and register all 4 adapters"
```

---

## Chunk 2: Agent CRUD API

### Task 3: Agent Config Schemas

**Files:**
- Create: `backend/app/schemas/agent_config.py`

- [ ] **Step 1: Create schemas**

```python
# backend/app/schemas/agent_config.py
from datetime import datetime
from pydantic import BaseModel


class AgentConfigResponse(BaseModel):
    model_config = {"from_attributes": True}

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
    created_at: datetime
    updated_at: datetime


class AgentConfigListResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    display_name: str
    icon: str
    description: str
    preferred_agent: str
    available: bool
    created_at: datetime


class AgentConfigCreate(BaseModel):
    name: str
    display_name: str
    icon: str = "🤖"
    description: str = ""
    system_prompt: str = ""
    skills: list[str] = []
    preferred_agent: str = "azure-openai"
    fallback_agents: list[str] = ["mock"]
    available: bool = True
    model_config_json: dict = {}


class AgentConfigUpdate(BaseModel):
    display_name: str | None = None
    icon: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    skills: list[str] | None = None
    preferred_agent: str | None = None
    fallback_agents: list[str] | None = None
    available: bool | None = None
    model_config_json: dict | None = None


class AdapterInfo(BaseModel):
    name: str
    available: bool
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/agent_config.py
git commit -m "feat(backend): add AgentConfig Pydantic schemas"
```

---

### Task 4: Agent CRUD Endpoints

**Files:**
- Modify: `backend/app/routers/agents.py`
- Create: `backend/tests/test_agent_admin.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_agent_admin.py
import pytest


async def get_admin_headers(client):
    await client.post("/api/auth/register", json={
        "username": "agent_admin", "email": "agent_admin@test.com",
        "password": "test1234", "role": "admin"
    })
    login = await client.post("/api/auth/token", data={
        "username": "agent_admin", "password": "test1234"
    })
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


@pytest.mark.asyncio
async def test_list_adapters(client):
    headers = await get_admin_headers(client)
    resp = await client.get("/api/agents/adapters", headers=headers)
    assert resp.status_code == 200
    adapters = resp.json()
    assert isinstance(adapters, list)
    names = [a["name"] for a in adapters]
    assert "mock" in names
    assert "azure-openai" in names
    assert "anthropic-claude" in names
    assert "openai" in names


@pytest.mark.asyncio
async def test_create_agent_config(client):
    headers = await get_admin_headers(client)
    resp = await client.post("/api/agents/configs", headers=headers, json={
        "name": "test-agent",
        "display_name": "测试助手",
        "description": "用于测试的助手",
        "system_prompt": "你是一个测试助手",
        "preferred_agent": "mock",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test-agent"
    assert data["display_name"] == "测试助手"


@pytest.mark.asyncio
async def test_update_agent_config(client):
    headers = await get_admin_headers(client)
    # Create first
    await client.post("/api/agents/configs", headers=headers, json={
        "name": "update-agent",
        "display_name": "更新前",
        "preferred_agent": "mock",
    })
    # Update
    resp = await client.patch("/api/agents/configs/update-agent", headers=headers, json={
        "display_name": "更新后",
        "system_prompt": "新的系统提示",
    })
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "更新后"
    assert resp.json()["system_prompt"] == "新的系统提示"


@pytest.mark.asyncio
async def test_delete_agent_config(client):
    headers = await get_admin_headers(client)
    # Create first
    await client.post("/api/agents/configs", headers=headers, json={
        "name": "delete-agent",
        "display_name": "待删除",
        "preferred_agent": "mock",
    })
    # Delete
    resp = await client.delete("/api/agents/configs/delete-agent", headers=headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_create_duplicate_name(client):
    headers = await get_admin_headers(client)
    await client.post("/api/agents/configs", headers=headers, json={
        "name": "dup-agent",
        "display_name": "第一个",
        "preferred_agent": "mock",
    })
    resp = await client.post("/api/agents/configs", headers=headers, json={
        "name": "dup-agent",
        "display_name": "重复的",
        "preferred_agent": "mock",
    })
    assert resp.status_code == 409
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python3 -m pytest tests/test_agent_admin.py -v
```
Expected: FAIL (endpoints don't exist)

- [ ] **Step 3: Add CRUD endpoints to agents router**

Add the following to `backend/app/routers/agents.py`:

```python
from app.schemas.agent_config import (
    AgentConfigResponse, AgentConfigCreate, AgentConfigUpdate, AdapterInfo,
)
from app.services.agents.registry import registry

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/adapters", response_model=list[AdapterInfo])
async def list_adapters(_: User = Depends(require_admin)):
    """List all registered AI adapters and their availability."""
    return [
        AdapterInfo(name=name, available=adapter.is_available())
        for name, adapter in registry.list_available().items()
    ]


@router.post("/configs", response_model=AgentConfigResponse, status_code=201)
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
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.patch("/configs/{agent_name}", response_model=AgentConfigResponse)
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
        if key == "model_config_json":
            agent.model_config_json = value
        else:
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
```

Note: Make sure to add necessary imports at the top of the file:
```python
from sqlalchemy import select
from app.models.agent_config import AgentConfig
```

Also, ensure the new admin routes (`/adapters`, `/configs`) are placed **before** the parameterized routes (`/{agent_name}`) to avoid route conflicts.

- [ ] **Step 4: Fix registry list_available method if needed**

Check that `registry.list_available()` returns all adapters (not just available ones). If it only returns available ones, add a method to list all:

Add to `backend/app/services/agents/registry.py`:

```python
def list_all(self) -> dict[str, BaseAgentAdapter]:
    """Return all registered adapters."""
    return dict(self._adapters)
```

And use `registry.list_all()` in the endpoint instead of `registry.list_available()`.

- [ ] **Step 5: Run tests**

```bash
cd backend && python3 -m pytest tests/test_agent_admin.py -v
```
Expected: ALL PASS

- [ ] **Step 6: Run all backend tests**

```bash
cd backend && python3 -m pytest tests/ -v
```
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/agents.py backend/app/schemas/agent_config.py backend/app/services/agents/registry.py backend/tests/test_agent_admin.py
git commit -m "feat(backend): add Agent config CRUD API with adapter listing"
```

---

## Chunk 3: Frontend Agent Admin Page

### Task 5: Frontend Agent Admin Page

**Files:**
- Create: `frontend/src/pages/AdminAgents.tsx`
- Modify: `frontend/src/routes.tsx`
- Modify: `frontend/src/hooks/useAgents.ts`
- Modify: `frontend/src/types/agent.ts`

- [ ] **Step 1: Update agent types**

Add to `frontend/src/types/agent.ts`:

```typescript
export interface AgentConfigDetail extends AgentConfig {
  system_prompt: string;
  skills: string[];
  preferred_agent: string;
  fallback_agents: string[];
  model_config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentConfigCreate {
  name: string;
  display_name: string;
  icon?: string;
  description?: string;
  system_prompt?: string;
  skills?: string[];
  preferred_agent?: string;
  fallback_agents?: string[];
  available?: boolean;
  model_config_json?: Record<string, unknown>;
}

export interface AgentConfigUpdate {
  display_name?: string;
  icon?: string;
  description?: string;
  system_prompt?: string;
  skills?: string[];
  preferred_agent?: string;
  fallback_agents?: string[];
  available?: boolean;
  model_config_json?: Record<string, unknown>;
}

export interface AdapterInfo {
  name: string;
  available: boolean;
}
```

- [ ] **Step 2: Add admin API methods**

Add to `frontend/src/api/agents.ts`:

```typescript
import type { AgentConfigDetail, AgentConfigCreate, AgentConfigUpdate, AdapterInfo } from "@/types/agent";

// Add to agentsApi object:
  listAdapters: async () => {
    const { data } = await api.get<AdapterInfo[]>("/agents/adapters");
    return data;
  },

  createConfig: async (body: AgentConfigCreate) => {
    const { data } = await api.post<AgentConfigDetail>("/agents/configs", body);
    return data;
  },

  updateConfig: async (name: string, body: AgentConfigUpdate) => {
    const { data } = await api.patch<AgentConfigDetail>(`/agents/configs/${name}`, body);
    return data;
  },

  deleteConfig: async (name: string) => {
    await api.delete(`/agents/configs/${name}`);
  },
```

- [ ] **Step 3: Add admin hooks**

Add to `frontend/src/hooks/useAgents.ts`:

```typescript
export function useAdapters() {
  return useQuery({
    queryKey: ["adapters"],
    queryFn: () => agentsApi.listAdapters(),
  });
}

export function useCreateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AgentConfigCreate) => agentsApi.createConfig(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: AgentConfigUpdate }) =>
      agentsApi.updateConfig(name, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useDeleteAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => agentsApi.deleteConfig(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}
```

Note: Add necessary imports (`useQueryClient`, `AgentConfigCreate`, `AgentConfigUpdate`).

- [ ] **Step 4: Create AdminAgents page**

```tsx
// frontend/src/pages/AdminAgents.tsx
import { useState } from "react";
import {
  Bot, Plus, Pencil, Trash2, CheckCircle, XCircle,
  Loader2, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import {
  PageHeader, GlassCard, GradientButton, SectionTitle,
  Badge, InfoBox,
} from "@/components/shared";
import {
  useAgentList, useAdapters, useCreateAgentConfig,
  useUpdateAgentConfig, useDeleteAgentConfig,
} from "@/hooks/useAgents";
import type { AgentConfigCreate, AgentConfigUpdate } from "@/types/agent";

export default function AdminAgents() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentConfigCreate>({
    name: "",
    display_name: "",
    icon: "🤖",
    description: "",
    system_prompt: "",
    skills: [],
    preferred_agent: "azure-openai",
    fallback_agents: ["mock"],
  });
  const [editData, setEditData] = useState<AgentConfigUpdate>({});
  const [skillInput, setSkillInput] = useState("");

  const { data: agents, isLoading } = useAgentList();
  const { data: adapters } = useAdapters();
  const createMutation = useCreateAgentConfig();
  const updateMutation = useUpdateAgentConfig();
  const deleteMutation = useDeleteAgentConfig();

  const handleCreate = async () => {
    await createMutation.mutateAsync(formData);
    setShowCreate(false);
    setFormData({
      name: "", display_name: "", icon: "🤖", description: "",
      system_prompt: "", skills: [], preferred_agent: "azure-openai",
      fallback_agents: ["mock"],
    });
  };

  const handleUpdate = async (name: string) => {
    await updateMutation.mutateAsync({ name, body: editData });
    setEditingAgent(null);
    setEditData({});
  };

  const handleDelete = async (name: string) => {
    if (confirm(`确定要删除 Agent "${name}" 吗？`)) {
      await deleteMutation.mutateAsync(name);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Agent 管理"
        description="配置 AI 助手的 System Prompt、Skills、模型后端"
      />

      {/* Adapter Status */}
      <GlassCard padding="lg">
        <SectionTitle>AI 后端适配器</SectionTitle>
        <div className="flex flex-wrap gap-3 mt-4">
          {adapters?.map((adapter) => (
            <div
              key={adapter.name}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                adapter.available
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {adapter.available ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium">
                {adapter.name === "azure-openai" ? "Azure OpenAI"
                  : adapter.name === "anthropic-claude" ? "Anthropic Claude"
                  : adapter.name === "openai" ? "OpenAI (Direct)"
                  : adapter.name === "mock" ? "Mock (开发)"
                  : adapter.name}
              </span>
              <Badge variant={adapter.available ? "gradient" : "outline"}>
                {adapter.available ? "可用" : "未配置"}
              </Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Create New Agent */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between">
          <SectionTitle>Agent 列表</SectionTitle>
          <GradientButton size="sm" onClick={() => setShowCreate(!showCreate)}>
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              创建 Agent
            </span>
          </GradientButton>
        </div>

        {showCreate && (
          <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 border border-purple-200/30 space-y-4">
            <h4 className="font-semibold text-gray-800">创建新 Agent</h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="名称标识 (英文, 如 my-agent)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
              />
              <input
                placeholder="显示名称 (中文)"
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
            <textarea
              placeholder="System Prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm font-mono"
            />
            <select
              value={formData.preferred_agent}
              onChange={(e) => setFormData({ ...formData, preferred_agent: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm"
            >
              {adapters?.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} {a.available ? "(可用)" : "(未配置)"}
                </option>
              ))}
            </select>
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

        {/* Agent List */}
        <div className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : agents && agents.length > 0 ? (
            agents.map((agent) => (
              <div
                key={agent.name}
                className="p-4 rounded-xl bg-white/50 border border-purple-100/30 hover:border-purple-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">{agent.display_name}</h4>
                      <p className="text-xs text-gray-500">{agent.name}</p>
                    </div>
                    <Badge variant={agent.available ? "gradient" : "outline"}>
                      {agent.available ? "启用" : "禁用"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedAgent(expandedAgent === agent.name ? null : agent.name)}
                      className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      {expandedAgent === agent.name ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAgent(agent.name);
                        setEditData({});
                      }}
                      className="p-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.name)}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {agent.description && (
                  <p className="text-sm text-gray-600 mt-2 ml-11">{agent.description}</p>
                )}

                {/* Expanded Detail / Edit */}
                {expandedAgent === agent.name && (
                  <div className="mt-4 ml-11 space-y-3 p-4 rounded-xl bg-purple-50/30 border border-purple-100/20">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">首选适配器</label>
                      {editingAgent === agent.name ? (
                        <select
                          value={editData.preferred_agent ?? agent.preferred_agent}
                          onChange={(e) => setEditData({ ...editData, preferred_agent: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-sm"
                        >
                          {adapters?.map((a) => (
                            <option key={a.name} value={a.name}>{a.name}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant="purple">{agent.preferred_agent}</Badge>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">System Prompt</label>
                      {editingAgent === agent.name ? (
                        <textarea
                          value={editData.system_prompt ?? agent.system_prompt}
                          onChange={(e) => setEditData({ ...editData, system_prompt: e.target.value })}
                          rows={6}
                          className="w-full px-3 py-2 rounded-lg border border-purple-200 text-sm font-mono"
                        />
                      ) : (
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white/50 p-3 rounded-lg max-h-40 overflow-auto">
                          {agent.system_prompt || "(空)"}
                        </pre>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {(editingAgent === agent.name ? editData.skills ?? agent.skills : agent.skills)?.map(
                          (skill, i) => (
                            <Badge key={i} variant="outline">
                              <Zap className="w-3 h-3 mr-1" />
                              {skill}
                            </Badge>
                          )
                        )}
                        {(!agent.skills || agent.skills.length === 0) && (
                          <span className="text-xs text-gray-400">暂无 Skills</span>
                        )}
                      </div>
                    </div>
                    {editingAgent === agent.name && (
                      <div className="flex gap-2 pt-2">
                        <GradientButton
                          size="sm"
                          onClick={() => handleUpdate(agent.name)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? "保存中..." : "保存"}
                        </GradientButton>
                        <button
                          onClick={() => { setEditingAgent(null); setEditData({}); }}
                          className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Bot className="w-12 h-12 mx-auto mb-3 text-purple-400" />
              <p>暂无 Agent 配置</p>
            </div>
          )}
        </div>
      </GlassCard>

      <InfoBox variant="tip" title="Agent 配置说明">
        <ul className="space-y-1">
          <li>- <strong>首选适配器</strong>: Agent 优先使用的 AI 后端 (Azure OpenAI / Claude / OpenAI)</li>
          <li>- <strong>备选适配器</strong>: 首选不可用时自动降级 (默认 mock)</li>
          <li>- <strong>System Prompt</strong>: 定义 Agent 的角色和行为边界</li>
          <li>- <strong>Skills</strong>: Agent 具备的能力标签 (目前为元数据)</li>
        </ul>
      </InfoBox>
    </div>
  );
}
```

- [ ] **Step 5: Add route**

Add to `frontend/src/routes.tsx`:

```tsx
import AdminAgents from "@/pages/AdminAgents";

// Add to routes array:
{ path: "admin/agents", element: <AdminAgents /> },
```

- [ ] **Step 6: Add nav link in Layout.tsx**

Add to the sidebar navigation items:

```tsx
{ name: "Agent 管理", icon: Bot, path: "/admin/agents" },
```

- [ ] **Step 7: TypeScript type check + build**

```bash
cd frontend && npx tsc -b && npm run build
```
Expected: 0 errors, build successful

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/AdminAgents.tsx frontend/src/routes.tsx frontend/src/components/Layout.tsx frontend/src/types/agent.ts frontend/src/api/agents.ts frontend/src/hooks/useAgents.ts
git commit -m "feat(frontend): add Agent admin management page"
```

---

### Task 6: E2E Tests + Final Verification

**Files:**
- Create: `frontend/e2e/admin-agents.spec.ts`

- [ ] **Step 1: Create E2E test**

```typescript
// frontend/e2e/admin-agents.spec.ts
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Admin Agent Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to agent management page", async ({ page }) => {
    await page.goto("/admin/agents");
    await expect(
      page.getByRole("heading", { name: "Agent 管理" })
    ).toBeVisible();
  });

  test("should show adapter status", async ({ page }) => {
    await page.goto("/admin/agents");
    await expect(page.getByText("AI 后端适配器")).toBeVisible();
    await expect(page.getByText("Mock")).toBeVisible();
  });

  test("should show agent list or empty state", async ({ page }) => {
    await page.goto("/admin/agents");
    await page.waitForTimeout(1000);
    const agentList = page.getByText("Agent 列表");
    await expect(agentList).toBeVisible();
  });

  test("should show create agent form", async ({ page }) => {
    await page.goto("/admin/agents");
    await page.getByRole("button", { name: /创建 Agent/ }).click();
    await expect(page.getByText("创建新 Agent")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
cd frontend && npx playwright test --reporter=list
```
Expected: ALL PASS

- [ ] **Step 3: Run full verification**

```bash
# Backend
cd backend && python3 -m pytest tests/ -v

# Frontend
cd frontend && npx tsc -b
cd frontend && npm run build
cd frontend && npx playwright test --reporter=list
```
Expected: ALL PASS

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: complete Agent admin configuration module with multi-adapter support"
git push origin main
```
