from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


# ── Sale Item (nested) ───────────────────────────────────────────────────────

class SaleItemCreate(BaseModel):
    procedure_id: int | None = None
    description: str
    quantity: float = 1.0
    unit_price: float
    # line_total is computed by the router: quantity * unit_price


class SaleItemResponse(BaseModel):
    id: int
    sale_id: int
    procedure_id: int | None
    description: str
    quantity: float
    unit_price: float
    line_total: float

    model_config = ConfigDict(from_attributes=True)


# ── Sale ─────────────────────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    client_id: int
    sale_date: date
    notes: str | None = None
    items: list[SaleItemCreate]


class SaleUpdate(BaseModel):
    sale_date: date | None = None
    notes: str | None = None
    # payment_status is computed from payments, not set manually


class SaleResponse(BaseModel):
    id: int
    client_id: int
    sale_date: date
    total_amount: float
    payment_status: str
    notes: str | None
    items: list[SaleItemResponse] = []
    # Payments are loaded separately via GET /sales/{id}/payments
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Sale with payment summary (used in client profile and reports) ───────────

class SaleSummaryResponse(BaseModel):
    id: int
    client_id: int
    sale_date: date
    total_amount: float
    total_paid: float
    remaining_balance: float
    payment_status: str
    notes: str | None

    model_config = ConfigDict(from_attributes=True)


# ── Invoice ───────────────────────────────────────────────────────────────────

class InvoiceSendRequest(BaseModel):
    """
    Body for POST /api/sales/{id}/send-invoice.

    recipient_email is optional — if omitted, the client's email on file
    is used. You can override it here to send to a different address
    (e.g. the client's spouse, an accountant, etc.).
    """
    recipient_email: str | None = None
