from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    default_price: float | None = None
    duration_minutes: int | None = None


class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    default_price: float | None = None
    duration_minutes: int | None = None
    is_active: bool | None = None


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: str | None
    default_price: float | None
    duration_minutes: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
