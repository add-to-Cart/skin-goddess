from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


PAYMENT_METHODS = ("cash", "gcash", "bank_transfer", "card", "other")


class PaymentCreate(BaseModel):
    sale_id: int
    payment_date: date
    amount: float
    payment_method: str | None = None
    notes: str | None = None


class PaymentUpdate(BaseModel):
    payment_date: date | None = None
    amount: float | None = None
    payment_method: str | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: int
    sale_id: int
    payment_date: date
    amount: float
    payment_method: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentHistoryResponse(BaseModel):
    """Full payment history for a sale, including computed balance."""
    sale_id: int
    total_amount: float
    total_paid: float
    remaining_balance: float
    payment_status: str
    payments: list[PaymentResponse]
