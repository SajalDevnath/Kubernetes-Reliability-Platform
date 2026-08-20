from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Request body for creating a user."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    is_active: bool = True


class UserUpdate(BaseModel):
    """Request body for updating a user."""

    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None


class UserResponse(BaseModel):
    """User data returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
