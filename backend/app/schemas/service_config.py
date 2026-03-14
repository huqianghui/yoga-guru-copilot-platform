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
