from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


# Valid status values
FOLLOW_UP_STATUSES = ("upcoming", "due", "completed", "cancelled")


class FollowUpCreate(BaseModel):
    client_id: int
    procedure_id: int | None = None
    follow_up_date: date
    status: str = "upcoming"
    notes: str | None = None


class FollowUpUpdate(BaseModel):
    follow_up_date: date | None = None
    status: str | None = None
    notes: str | None = None


class FollowUpResponse(BaseModel):
    id: int
    client_id: int
    procedure_id: int | None
    follow_up_date: date
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
