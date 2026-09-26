from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    position: str | None = None
    salary_type: str | None = None
    date_hired: date | None = None
    notes: str | None = None


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    position: str | None = None
    salary_type: str | None = None
    date_hired: date | None = None
    notes: str | None = None
    is_active: bool | None = None


class EmployeeResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str | None
    email: str | None
    address: str | None
    position: str | None
    salary_type: str | None
    date_hired: date | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
