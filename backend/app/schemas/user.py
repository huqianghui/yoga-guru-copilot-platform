from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    role: str
    avatar_url: str | None = None

    model_config = {"from_attributes": True}
