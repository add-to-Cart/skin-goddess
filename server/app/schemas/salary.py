from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


# Valid status values
SALARY_STATUSES = ("pending", "released")


class SalaryRecordCreate(BaseModel):
    employee_id: int
    period_start: date
    period_end: date
    gross_amount: float
    deductions: float = 0.0
    net_amount: float
    release_date: date | None = None
    status: str = "pending"
    notes: str | None = None


class SalaryRecordUpdate(BaseModel):
    period_start: date | None = None
    period_end: date | None = None
    gross_amount: float | None = None
    deductions: float | None = None
    net_amount: float | None = None
    release_date: date | None = None
    status: str | None = None
    notes: str | None = None


class SalaryRecordResponse(BaseModel):
    id: int
    employee_id: int
    period_start: date
    period_end: date
    gross_amount: float
    deductions: float
    net_amount: float
    release_date: date | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
