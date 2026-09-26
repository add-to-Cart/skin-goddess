from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


EXPENSE_CATEGORIES = (
    "inventory",
    "supplies",
    "rent",
    "utilities",
    "salary",
    "equipment",
    "other",
)


class ExpenseCreate(BaseModel):
    expense_date: date
    description: str
    category: str | None = None
    amount: float
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    expense_date: date | None = None
    description: str | None = None
    category: str | None = None
    amount: float | None = None
    notes: str | None = None


class ExpenseResponse(BaseModel):
    id: int
    expense_date: date
    description: str
    category: str | None
    amount: float
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
