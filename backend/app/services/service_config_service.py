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
        await client.chat.completions.create(
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
