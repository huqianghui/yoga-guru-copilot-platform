from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
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
