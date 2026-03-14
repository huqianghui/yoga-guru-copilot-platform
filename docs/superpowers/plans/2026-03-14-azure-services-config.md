# Azure Services 配置模块 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Azure Content Understanding 视频/图片分析的真实集成，并创建管理员可配置的 Azure 服务设置模块。

**Architecture:** 在现有 `config.py` 基础上，增加数据库持久化的服务配置（ServiceConfig 模型），实现 Azure CU SDK 调用进行视频分析和关键帧提取，提供管理员 API 和前端配置页面。配置优先级：数据库配置 > 环境变量 > 默认值。

**Tech Stack:** Azure Content Understanding SDK (azure-ai-contentsafety), Azure OpenAI, FastAPI, SQLAlchemy, React + TanStack Query

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/app/models/service_config.py` | ServiceConfig ORM 模型 |
| Modify | `backend/app/models/__init__.py` | 导入新模型 |
| Create | `backend/app/schemas/service_config.py` | Pydantic 配置 schemas |
| Create | `backend/app/services/service_config_service.py` | 配置 CRUD 服务 |
| Create | `backend/app/routers/admin.py` | 管理员配置 API |
| Modify | `backend/app/main.py` | 注册 admin router |
| Create | `backend/app/services/azure_cu_service.py` | Azure CU 视频分析服务 |
| Modify | `backend/app/services/video_service.py` | 接入真实 Azure CU |
| Modify | `backend/app/config.py` | 增加配置合并逻辑 |
| Modify | `backend/requirements.txt` | 增加 Azure SDK 依赖 |
| Create | `backend/tests/test_service_config.py` | 配置 API 测试 |
| Create | `backend/tests/test_azure_cu.py` | Azure CU 集成测试 |
| Create | `frontend/src/api/admin.ts` | 管理员 API client |
| Create | `frontend/src/hooks/useAdmin.ts` | 管理员 hooks |
| Create | `frontend/src/pages/AdminSettings.tsx` | 管理员配置页面 |
| Modify | `frontend/src/routes.tsx` | 添加管理员路由 |
| Create | `frontend/e2e/admin-settings.spec.ts` | E2E 测试 |
| Create | `backend/alembic/versions/xxx_add_service_config.py` | 数据库迁移 |

---

## Chunk 1: Service Configuration Backend

### Task 1: ServiceConfig 数据模型

**Files:**
- Create: `backend/app/models/service_config.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create ServiceConfig model**

```python
# backend/app/models/service_config.py
from sqlalchemy import String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class ServiceConfig(TimestampMixin, Base):
    """Admin-configurable service settings.

    Stores Azure OpenAI, Content Understanding, and other service configs.
    Values here override environment variable defaults.
    """

    __tablename__ = "service_configs"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(String(500), default="")
    category: Mapped[str] = mapped_column(String(50), default="general")
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)
```

- [ ] **Step 2: Register model in __init__.py**

Add to `backend/app/models/__init__.py`:

```python
from app.models.service_config import ServiceConfig

__all__ = [
    # ... existing exports ...
    "ServiceConfig",
]
```

- [ ] **Step 3: Generate Alembic migration**

```bash
cd backend && alembic revision --autogenerate -m "add service_configs table"
```

- [ ] **Step 4: Run migration**

```bash
cd backend && alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/service_config.py backend/app/models/__init__.py backend/alembic/versions/
git commit -m "feat(backend): add ServiceConfig model for admin-configurable settings"
```

---

### Task 2: Service Config Schemas + Service

**Files:**
- Create: `backend/app/schemas/service_config.py`
- Create: `backend/app/services/service_config_service.py`

- [ ] **Step 1: Create Pydantic schemas**

```python
# backend/app/schemas/service_config.py
from datetime import datetime
from pydantic import BaseModel


class ServiceConfigResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    key: str
    value: str
    description: str
    category: str
    is_secret: bool
    created_at: datetime
    updated_at: datetime


class ServiceConfigMaskedResponse(ServiceConfigResponse):
    """Response with secret values masked."""

    @classmethod
    def from_config(cls, config) -> "ServiceConfigMaskedResponse":
        data = ServiceConfigResponse.model_validate(config).model_dump()
        if config.is_secret and config.value:
            data["value"] = "***" + config.value[-4:] if len(config.value) > 4 else "****"
        return cls(**data)


class ServiceConfigUpdate(BaseModel):
    value: str


class ServiceConfigCreate(BaseModel):
    key: str
    value: str = ""
    description: str = ""
    category: str = "general"
    is_secret: bool = False


class ConnectionTestResult(BaseModel):
    service: str
    status: str  # "connected" | "error" | "not_configured"
    message: str
```

- [ ] **Step 2: Create service layer**

```python
# backend/app/services/service_config_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service_config import ServiceConfig
from app.schemas.service_config import ConnectionTestResult
from app.config import get_settings


async def list_configs(db: AsyncSession, category: str | None = None) -> list[ServiceConfig]:
    stmt = select(ServiceConfig).order_by(ServiceConfig.category, ServiceConfig.key)
    if category:
        stmt = stmt.where(ServiceConfig.category == category)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_config(db: AsyncSession, key: str) -> ServiceConfig | None:
    stmt = select(ServiceConfig).where(ServiceConfig.key == key)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_config_value(db: AsyncSession, key: str) -> str:
    """Get config value from DB, fallback to env var via Settings."""
    config = await get_config(db, key)
    if config and config.value:
        return config.value
    # Fallback to environment variable
    settings = get_settings()
    env_mapping = {
        "azure_openai_endpoint": settings.azure_openai_endpoint,
        "azure_openai_key": settings.azure_openai_key,
        "azure_openai_deployment": settings.azure_openai_deployment,
        "azure_openai_api_version": settings.azure_openai_api_version,
        "azure_cu_endpoint": settings.azure_cu_endpoint,
        "azure_cu_key": settings.azure_cu_key,
    }
    return env_mapping.get(key, "")


async def upsert_config(
    db: AsyncSession, key: str, value: str, description: str = "", category: str = "general", is_secret: bool = False
) -> ServiceConfig:
    config = await get_config(db, key)
    if config:
        config.value = value
        if description:
            config.description = description
    else:
        config = ServiceConfig(
            key=key, value=value, description=description, category=category, is_secret=is_secret
        )
        db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def delete_config(db: AsyncSession, key: str) -> bool:
    config = await get_config(db, key)
    if not config:
        return False
    await db.delete(config)
    await db.commit()
    return True


async def seed_default_configs(db: AsyncSession) -> None:
    """Seed default configuration entries if they don't exist."""
    defaults = [
        ("azure_openai_endpoint", "", "Azure OpenAI 服务端点 URL", "azure_openai", True),
        ("azure_openai_key", "", "Azure OpenAI API 密钥", "azure_openai", True),
        ("azure_openai_deployment", "gpt-4o", "Azure OpenAI 模型部署名称", "azure_openai", False),
        ("azure_openai_api_version", "2024-08-01-preview", "Azure OpenAI API 版本", "azure_openai", False),
        ("azure_cu_endpoint", "", "Azure Content Understanding 端点 URL", "azure_cu", True),
        ("azure_cu_key", "", "Azure Content Understanding API 密钥", "azure_cu", True),
    ]
    for key, value, desc, cat, secret in defaults:
        existing = await get_config(db, key)
        if not existing:
            db.add(ServiceConfig(key=key, value=value, description=desc, category=cat, is_secret=secret))
    await db.commit()


async def test_azure_openai_connection(db: AsyncSession) -> ConnectionTestResult:
    """Test Azure OpenAI connectivity."""
    endpoint = await get_config_value(db, "azure_openai_endpoint")
    key = await get_config_value(db, "azure_openai_key")
    deployment = await get_config_value(db, "azure_openai_deployment")

    if not endpoint or not key:
        return ConnectionTestResult(
            service="Azure OpenAI", status="not_configured", message="未配置端点或密钥"
        )

    try:
        from openai import AsyncAzureOpenAI

        client = AsyncAzureOpenAI(azure_endpoint=endpoint, api_key=key, api_version="2024-08-01-preview")
        resp = await client.chat.completions.create(
            model=deployment, messages=[{"role": "user", "content": "ping"}], max_tokens=5
        )
        return ConnectionTestResult(
            service="Azure OpenAI", status="connected", message=f"连接成功，模型: {deployment}"
        )
    except Exception as e:
        return ConnectionTestResult(
            service="Azure OpenAI", status="error", message=f"连接失败: {str(e)[:200]}"
        )


async def test_azure_cu_connection(db: AsyncSession) -> ConnectionTestResult:
    """Test Azure Content Understanding connectivity."""
    endpoint = await get_config_value(db, "azure_cu_endpoint")
    key = await get_config_value(db, "azure_cu_key")

    if not endpoint or not key:
        return ConnectionTestResult(
            service="Azure Content Understanding", status="not_configured", message="未配置端点或密钥"
        )

    try:
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{endpoint.rstrip('/')}/contentunderstanding/analyzers?api-version=2024-12-01-preview",
                headers={"Ocp-Apim-Subscription-Key": key},
                timeout=10,
            )
            if resp.status_code == 200:
                return ConnectionTestResult(
                    service="Azure Content Understanding", status="connected", message="连接成功"
                )
            return ConnectionTestResult(
                service="Azure Content Understanding",
                status="error",
                message=f"HTTP {resp.status_code}: {resp.text[:200]}",
            )
    except Exception as e:
        return ConnectionTestResult(
            service="Azure Content Understanding", status="error", message=f"连接失败: {str(e)[:200]}"
        )
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/service_config.py backend/app/services/service_config_service.py
git commit -m "feat(backend): add service config schemas and CRUD service"
```

---

### Task 3: Admin API Router

**Files:**
- Create: `backend/app/routers/admin.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_service_config.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_service_config.py
import pytest


@pytest.mark.asyncio
async def test_list_configs_requires_auth(client):
    resp = await client.get("/api/admin/configs")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_configs(client):
    # Login as admin
    await client.post("/api/auth/register", json={
        "username": "admin_cfg", "email": "admin_cfg@test.com",
        "password": "test1234", "role": "admin"
    })
    login = await client.post("/api/auth/token", data={
        "username": "admin_cfg", "password": "test1234"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/admin/configs", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_upsert_config(client):
    await client.post("/api/auth/register", json={
        "username": "admin_cfg2", "email": "admin_cfg2@test.com",
        "password": "test1234", "role": "admin"
    })
    login = await client.post("/api/auth/token", data={
        "username": "admin_cfg2", "password": "test1234"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create
    resp = await client.put("/api/admin/configs/test_key", headers=headers, json={
        "value": "test_value"
    })
    assert resp.status_code == 200
    assert resp.json()["key"] == "test_key"

    # Update
    resp = await client.put("/api/admin/configs/test_key", headers=headers, json={
        "value": "updated_value"
    })
    assert resp.status_code == 200
    assert resp.json()["value"] == "updated_value"


@pytest.mark.asyncio
async def test_delete_config(client):
    await client.post("/api/auth/register", json={
        "username": "admin_cfg3", "email": "admin_cfg3@test.com",
        "password": "test1234", "role": "admin"
    })
    login = await client.post("/api/auth/token", data={
        "username": "admin_cfg3", "password": "test1234"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create first
    await client.put("/api/admin/configs/del_key", headers=headers, json={
        "value": "to_delete"
    })

    # Delete
    resp = await client.delete("/api/admin/configs/del_key", headers=headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_connection_test(client):
    await client.post("/api/auth/register", json={
        "username": "admin_cfg4", "email": "admin_cfg4@test.com",
        "password": "test1234", "role": "admin"
    })
    login = await client.post("/api/auth/token", data={
        "username": "admin_cfg4", "password": "test1234"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/api/admin/test-connection/azure-openai", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "Azure OpenAI"
    assert data["status"] in ["connected", "error", "not_configured"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python3 -m pytest tests/test_service_config.py -v
```
Expected: FAIL (404, endpoint doesn't exist)

- [ ] **Step 3: Create admin router**

```python
# backend/app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.schemas.service_config import (
    ServiceConfigMaskedResponse,
    ServiceConfigUpdate,
    ConnectionTestResult,
)
from app.services import service_config_service as svc

router = APIRouter()


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/configs", response_model=list[ServiceConfigMaskedResponse])
async def list_configs(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    configs = await svc.list_configs(db, category)
    return [ServiceConfigMaskedResponse.from_config(c) for c in configs]


@router.put("/configs/{key}", response_model=ServiceConfigMaskedResponse)
async def upsert_config(
    key: str,
    body: ServiceConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    config = await svc.upsert_config(db, key, body.value)
    return ServiceConfigMaskedResponse.from_config(config)


@router.delete("/configs/{key}", status_code=204)
async def delete_config(
    key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    deleted = await svc.delete_config(db, key)
    if not deleted:
        raise HTTPException(status_code=404, detail="Config not found")


@router.post("/test-connection/{service_name}", response_model=ConnectionTestResult)
async def test_connection(
    service_name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    if service_name == "azure-openai":
        return await svc.test_azure_openai_connection(db)
    elif service_name == "azure-cu":
        return await svc.test_azure_cu_connection(db)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown service: {service_name}")


@router.post("/seed-defaults", status_code=200)
async def seed_defaults(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    await svc.seed_default_configs(db)
    return {"message": "Default configs seeded"}
```

- [ ] **Step 4: Register admin router in main.py**

Add to `backend/app/main.py`:

```python
from app.routers import auth, users, agents, dashboard, courses, surveys, videos, health, admin

app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
```

- [ ] **Step 5: Run tests**

```bash
cd backend && python3 -m pytest tests/test_service_config.py -v
```
Expected: ALL PASS

- [ ] **Step 6: Run all backend tests**

```bash
cd backend && python3 -m pytest tests/ -v
```
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/admin.py backend/app/main.py backend/tests/test_service_config.py
git commit -m "feat(backend): add admin config API with connection testing"
```

---

## Chunk 2: Azure Content Understanding Integration

### Task 4: Azure CU Video Analysis Service

**Files:**
- Create: `backend/app/services/azure_cu_service.py`
- Modify: `backend/app/services/video_service.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add Azure SDK dependency**

Add to `backend/requirements.txt`:

```
httpx==0.27.0
```

Note: We use `httpx` for Azure CU REST API calls since the Azure Content Understanding SDK is still in preview and not stable. Direct REST API calls give us more control.

- [ ] **Step 2: Install dependency**

```bash
cd backend && pip install httpx==0.27.0
```

- [ ] **Step 3: Create Azure CU service**

```python
# backend/app/services/azure_cu_service.py
"""Azure Content Understanding integration for video analysis."""
import json
import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

API_VERSION = "2024-12-01-preview"


async def analyze_video_with_cu(
    endpoint: str, key: str, video_url: str
) -> dict:
    """Submit video for analysis and poll until completion.

    Args:
        endpoint: Azure CU endpoint URL
        key: Azure CU subscription key
        video_url: Publicly accessible URL of the video file

    Returns:
        Analysis result dict with teaching_style, rhythm, etc.
    """
    base_url = endpoint.rstrip("/")
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
    }

    # Create analyzer (if not exists, this is idempotent)
    analyzer_id = "yoga-video-analyzer"
    analyzer_url = f"{base_url}/contentunderstanding/analyzers/{analyzer_id}?api-version={API_VERSION}"

    analyzer_body = {
        "description": "Yoga teaching video analyzer",
        "scenario": "videoAnalysis",
        "fieldSchema": {
            "fields": {
                "teaching_style": {
                    "type": "string",
                    "description": "The teaching style observed (e.g., 温和引导型, 力量激励型)",
                },
                "rhythm": {
                    "type": "string",
                    "description": "Teaching rhythm (e.g., 缓慢流畅, 快节奏)",
                },
                "guidance_method": {
                    "type": "string",
                    "description": "Primary guidance method (e.g., 口令引导, 示范引导)",
                },
                "core_philosophy": {
                    "type": "string",
                    "description": "Core teaching philosophy summary",
                },
                "key_moments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "timestamp": {"type": "string"},
                            "description": {"type": "string"},
                            "frame_type": {"type": "string", "enum": ["quality", "teaching"]},
                            "pose_name": {"type": "string"},
                        },
                    },
                    "description": "Key moments in the video with timestamps",
                },
            }
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        # Create/update analyzer
        resp = await client.put(analyzer_url, headers=headers, json=analyzer_body)
        if resp.status_code not in (200, 201):
            logger.warning(f"Analyzer creation returned {resp.status_code}: {resp.text[:200]}")

        # Submit analysis job
        analyze_url = f"{base_url}/contentunderstanding/analyzers/{analyzer_id}:analyze?api-version={API_VERSION}"
        analyze_body = {"url": video_url}

        resp = await client.post(analyze_url, headers=headers, json=analyze_body)
        if resp.status_code not in (200, 202):
            raise RuntimeError(f"Video analysis submission failed: {resp.status_code} {resp.text[:200]}")

        result_data = resp.json()

        # If 202, poll for completion
        if resp.status_code == 202:
            operation_url = resp.headers.get("Operation-Location", "")
            if not operation_url:
                raise RuntimeError("No Operation-Location header in 202 response")

            for _ in range(60):  # Poll up to 5 minutes
                await asyncio.sleep(5)
                poll_resp = await client.get(operation_url, headers=headers)
                poll_data = poll_resp.json()
                status = poll_data.get("status", "")
                if status == "succeeded":
                    result_data = poll_data.get("result", poll_data)
                    break
                elif status in ("failed", "canceled"):
                    raise RuntimeError(f"Analysis {status}: {poll_data}")
            else:
                raise RuntimeError("Analysis timed out after 5 minutes")

    # Parse results into our expected format
    fields = result_data.get("contents", [{}])[0].get("fields", result_data.get("fields", {}))

    return {
        "teaching_style": fields.get("teaching_style", {}).get("valueString", "未识别"),
        "rhythm": fields.get("rhythm", {}).get("valueString", "未识别"),
        "guidance_method": fields.get("guidance_method", {}).get("valueString", "未识别"),
        "core_philosophy": fields.get("core_philosophy", {}).get("valueString", ""),
        "key_moments": fields.get("key_moments", {}).get("valueArray", []),
        "raw_result": result_data,
    }
```

- [ ] **Step 4: Update video_service.py to use Azure CU**

Replace the placeholder in `backend/app/services/video_service.py` `analyze_video()` function. The `# TODO: Implement real Azure CU call in production` / `pass` block should be replaced with:

```python
# Try Azure Content Understanding first
if settings.azure_cu_endpoint and settings.azure_cu_key:
    try:
        from app.services.azure_cu_service import analyze_video_with_cu

        # Build video URL (in production, this should be a publicly accessible URL)
        # For local dev, the video needs to be served via a public URL
        video_url = f"https://{settings.app_domain or 'localhost'}/uploads/videos/{video.filename}"
        cu_result = await analyze_video_with_cu(
            settings.azure_cu_endpoint, settings.azure_cu_key, video_url
        )

        analysis = VideoAnalysis(
            video_id=video.id,
            teaching_style=cu_result.get("teaching_style", ""),
            rhythm=cu_result.get("rhythm", ""),
            guidance_method=cu_result.get("guidance_method", ""),
            core_philosophy=cu_result.get("core_philosophy", ""),
            high_freq_words=[],
            raw_result=cu_result.get("raw_result", {}),
        )
        db.add(analysis)

        # Extract key moments as frames
        for moment in cu_result.get("key_moments", []):
            frame = VideoFrame(
                video_id=video.id,
                frame_path="",
                timestamp=moment.get("timestamp", "00:00"),
                frame_type=moment.get("frame_type", "quality"),
                pose_name=moment.get("pose_name", ""),
                description=moment.get("description", ""),
            )
            db.add(frame)

        video.status = "analyzed"
        await db.commit()
        await db.refresh(video)
        return video

    except Exception as e:
        logger.warning(f"Azure CU analysis failed, falling back to agent: {e}")
```

- [ ] **Step 5: Add `app_domain` to config.py**

Add to `backend/app/config.py` Settings class:

```python
app_domain: str = ""
```

- [ ] **Step 6: Run all backend tests**

```bash
cd backend && python3 -m pytest tests/ -v
```
Expected: ALL PASS (Azure CU code only triggers when credentials are set)

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/azure_cu_service.py backend/app/services/video_service.py backend/app/config.py backend/requirements.txt
git commit -m "feat(backend): implement Azure Content Understanding video analysis integration"
```

---

## Chunk 3: Frontend Admin Configuration Page

### Task 5: Frontend Admin API + Hooks

**Files:**
- Create: `frontend/src/api/admin.ts`
- Create: `frontend/src/hooks/useAdmin.ts`
- Create: `frontend/src/types/admin.ts`

- [ ] **Step 1: Create admin types**

```typescript
// frontend/src/types/admin.ts
export interface ServiceConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTestResult {
  service: string;
  status: "connected" | "error" | "not_configured";
  message: string;
}
```

- [ ] **Step 2: Create admin API client**

```typescript
// frontend/src/api/admin.ts
import api from "./client";
import type { ServiceConfig, ConnectionTestResult } from "@/types/admin";

export const adminApi = {
  listConfigs: async (category?: string) => {
    const params = category ? { category } : {};
    const { data } = await api.get<ServiceConfig[]>("/admin/configs", { params });
    return data;
  },

  upsertConfig: async (key: string, value: string) => {
    const { data } = await api.put<ServiceConfig>(`/admin/configs/${key}`, { value });
    return data;
  },

  deleteConfig: async (key: string) => {
    await api.delete(`/admin/configs/${key}`);
  },

  testConnection: async (serviceName: string) => {
    const { data } = await api.post<ConnectionTestResult>(
      `/admin/test-connection/${serviceName}`
    );
    return data;
  },

  seedDefaults: async () => {
    await api.post("/admin/seed-defaults");
  },
};
```

- [ ] **Step 3: Create admin hooks**

```typescript
// frontend/src/hooks/useAdmin.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";

export function useServiceConfigs(category?: string) {
  return useQuery({
    queryKey: ["service-configs", category],
    queryFn: () => adminApi.listConfigs(category),
  });
}

export function useUpsertConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.upsertConfig(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-configs"] }),
  });
}

export function useDeleteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => adminApi.deleteConfig(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-configs"] }),
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (serviceName: string) => adminApi.testConnection(serviceName),
  });
}

export function useSeedDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.seedDefaults(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-configs"] }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/admin.ts frontend/src/api/admin.ts frontend/src/hooks/useAdmin.ts
git commit -m "feat(frontend): add admin API client and hooks for service configuration"
```

---

### Task 6: Admin Settings Page

**Files:**
- Create: `frontend/src/pages/AdminSettings.tsx`
- Modify: `frontend/src/routes.tsx`

- [ ] **Step 1: Create AdminSettings page**

```tsx
// frontend/src/pages/AdminSettings.tsx
import { useState } from "react";
import {
  Settings, Wifi, WifiOff, CheckCircle, AlertTriangle,
  Loader2, RefreshCw, Save, Eye, EyeOff,
} from "lucide-react";
import {
  PageHeader, GlassCard, GradientButton, SectionTitle,
  Badge, InfoBox,
} from "@/components/shared";
import {
  useServiceConfigs, useUpsertConfig, useTestConnection,
  useSeedDefaults,
} from "@/hooks/useAdmin";
import type { ConnectionTestResult } from "@/types/admin";

export default function AdminSettings() {
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});

  const { data: configs, isLoading } = useServiceConfigs();
  const upsertMutation = useUpsertConfig();
  const testMutation = useTestConnection();
  const seedMutation = useSeedDefaults();

  const categories = configs
    ? [...new Set(configs.map((c) => c.category))]
    : [];

  const categoryLabels: Record<string, string> = {
    azure_openai: "Azure OpenAI",
    azure_cu: "Azure Content Understanding",
    general: "通用配置",
  };

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (value !== undefined) {
      await upsertMutation.mutateAsync({ key, value });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleTest = async (serviceName: string) => {
    const result = await testMutation.mutateAsync(serviceName);
    setTestResults((prev) => ({ ...prev, [serviceName]: result }));
  };

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="系统配置"
        description="管理 Azure 服务连接和系统设置"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : configs && configs.length === 0 ? (
        <GlassCard padding="lg" className="text-center">
          <Settings className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            尚未初始化配置
          </h3>
          <p className="text-gray-600 mb-4">点击下方按钮加载默认配置项</p>
          <GradientButton
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? "初始化中..." : "初始化默认配置"}
          </GradientButton>
        </GlassCard>
      ) : (
        <>
          {/* Connection Tests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: "azure-openai", label: "Azure OpenAI" },
              { name: "azure-cu", label: "Azure Content Understanding" },
            ].map(({ name, label }) => {
              const result = testResults[name];
              return (
                <GlassCard key={name} padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <SectionTitle>{label}</SectionTitle>
                    <GradientButton
                      size="sm"
                      onClick={() => handleTest(name)}
                      disabled={testMutation.isPending}
                    >
                      <span className="flex items-center gap-2">
                        {testMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wifi className="w-4 h-4" />
                        )}
                        测试连接
                      </span>
                    </GradientButton>
                  </div>
                  {result && (
                    <div
                      className={`p-3 rounded-xl flex items-center gap-3 ${
                        result.status === "connected"
                          ? "bg-green-50 border border-green-200"
                          : result.status === "error"
                          ? "bg-red-50 border border-red-200"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      {result.status === "connected" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : result.status === "error" ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="text-sm">{result.message}</span>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>

          {/* Config Groups */}
          {categories.map((cat) => (
            <GlassCard key={cat} padding="lg">
              <SectionTitle>
                {categoryLabels[cat] || cat}
              </SectionTitle>
              <div className="space-y-4 mt-4">
                {configs
                  ?.filter((c) => c.category === cat)
                  .map((config) => (
                    <div
                      key={config.key}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50/30 to-green-50/30 border border-purple-100/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono text-purple-700">
                            {config.key}
                          </code>
                          {config.is_secret && (
                            <Badge variant="warning">Secret</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {config.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type={
                              config.is_secret && !showSecrets[config.key]
                                ? "password"
                                : "text"
                            }
                            value={
                              editValues[config.key] !== undefined
                                ? editValues[config.key]
                                : config.value
                            }
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [config.key]: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-1.5 rounded-lg border border-purple-200 focus:border-purple-400 focus:outline-none text-sm font-mono"
                            placeholder="未设置"
                          />
                          {config.is_secret && (
                            <button
                              onClick={() =>
                                setShowSecrets((prev) => ({
                                  ...prev,
                                  [config.key]: !prev[config.key],
                                }))
                              }
                              className="p-2 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                            >
                              {showSecrets[config.key] ? (
                                <EyeOff className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          )}
                          {editValues[config.key] !== undefined && (
                            <button
                              onClick={() => handleSave(config.key)}
                              disabled={upsertMutation.isPending}
                              className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </GlassCard>
          ))}

          <InfoBox variant="tip" title="配置说明">
            <ul className="space-y-1">
              <li>- 数据库中的配置会覆盖环境变量中的默认值</li>
              <li>- Secret 类型的值在显示时会被遮罩处理</li>
              <li>- 修改配置后，使用"测试连接"验证服务可用性</li>
            </ul>
          </InfoBox>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route to routes.tsx**

Add to `frontend/src/routes.tsx` inside the Layout children array:

```tsx
import AdminSettings from "@/pages/AdminSettings";

// Add to routes array:
{ path: "admin/settings", element: <AdminSettings /> },
```

- [ ] **Step 3: Add navigation link**

Add an admin settings link in the sidebar navigation (`Layout.tsx`). Add after the existing nav items, conditionally shown for admin users:

```tsx
{ name: "系统配置", icon: Settings, path: "/admin/settings" },
```

- [ ] **Step 4: TypeScript type check**

```bash
cd frontend && npx tsc -b
```
Expected: 0 errors

- [ ] **Step 5: Build**

```bash
cd frontend && npm run build
```
Expected: Build successful

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/AdminSettings.tsx frontend/src/routes.tsx frontend/src/components/Layout.tsx
git commit -m "feat(frontend): add admin settings page for Azure service configuration"
```

---

### Task 7: E2E Tests + Final Verification

**Files:**
- Create: `frontend/e2e/admin-settings.spec.ts`

- [ ] **Step 1: Create E2E test**

```typescript
// frontend/e2e/admin-settings.spec.ts
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Admin Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to admin settings page", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(
      page.getByRole("heading", { name: "系统配置" })
    ).toBeVisible();
  });

  test("should show initialization or config list", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForTimeout(1000);
    // Should show either "初始化默认配置" button or config entries
    const initButton = page.getByRole("button", { name: /初始化/ });
    const configSection = page.getByText("Azure OpenAI");
    await expect(initButton.or(configSection)).toBeVisible();
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
cd backend && python3 -m pytest tests/ -v
cd frontend && npx tsc -b && npm run build
cd frontend && npx playwright test --reporter=list
```
Expected: ALL PASS

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: complete Azure services configuration module with admin UI"
git push origin main
```
