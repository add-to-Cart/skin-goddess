from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


# ── Procedure Supply (nested) ────────────────────────────────────────────────

class ProcedureSupplyCreate(BaseModel):
    inventory_item_id: int
    quantity_used: float
    unit_cost_at_use: float | None = None
    notes: str | None = None


class ProcedureSupplyResponse(BaseModel):
    id: int
    procedure_id: int
    inventory_item_id: int
    quantity_used: float
    unit_cost_at_use: float | None
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Procedure ────────────────────────────────────────────────────────────────

class ProcedureCreate(BaseModel):
    client_id: int
    service_id: int
    employee_id: int | None = None
    procedure_date: date
    session_number: int | None = None
    price: float | None = None
    next_follow_up: date | None = None
    notes: str | None = None
    # Optional: supplies can be submitted together with the procedure
    supplies: list[ProcedureSupplyCreate] = []


class ProcedureUpdate(BaseModel):
    service_id: int | None = None
    employee_id: int | None = None
    procedure_date: date | None = None
    session_number: int | None = None
    price: float | None = None
    next_follow_up: date | None = None
    notes: str | None = None


class ProcedureResponse(BaseModel):
    id: int
    client_id: int
    service_id: int
    employee_id: int | None
    procedure_date: date
    session_number: int | None
    price: float | None
    next_follow_up: date | None
    notes: str | None
    supplies_used: list[ProcedureSupplyResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
