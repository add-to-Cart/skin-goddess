from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


# ── Inventory Item ───────────────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    name: str
    category: str | None = None
    unit: str | None = None
    current_quantity: float = 0.0
    minimum_stock_level: float | None = None
    acquisition_cost: float | None = None
    selling_price: float | None = None
    description: str | None = None


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit: str | None = None
    minimum_stock_level: float | None = None
    acquisition_cost: float | None = None
    selling_price: float | None = None
    description: str | None = None
    is_active: bool | None = None


class InventoryItemResponse(BaseModel):
    id: int
    name: str
    category: str | None
    unit: str | None
    current_quantity: float
    minimum_stock_level: float | None
    acquisition_cost: float | None
    selling_price: float | None
    description: str | None
    is_active: bool
    # Computed field — True when current_quantity <= minimum_stock_level
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Inventory Transaction ────────────────────────────────────────────────────

class InventoryTransactionCreate(BaseModel):
    inventory_item_id: int
    transaction_type: str          # stock_in | stock_out | adjustment_add | adjustment_sub
    quantity_change: float
    reference_type: str | None = None
    reference_id: int | None = None
    notes: str | None = None


class InventoryTransactionResponse(BaseModel):
    id: int
    inventory_item_id: int
    transaction_type: str
    quantity_change: float
    quantity_after: float | None
    reference_type: str | None
    reference_id: int | None
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Inventory Purchase ───────────────────────────────────────────────────────

class InventoryPurchaseItemCreate(BaseModel):
    inventory_item_id: int
    quantity: float
    unit_cost: float
    # line_total is computed by the router: quantity * unit_cost


class InventoryPurchaseItemResponse(BaseModel):
    id: int
    purchase_id: int
    inventory_item_id: int
    quantity: float
    unit_cost: float
    line_total: float | None

    model_config = ConfigDict(from_attributes=True)


class InventoryPurchaseCreate(BaseModel):
    purchase_date: date
    supplier_name: str | None = None
    supplier_contact: str | None = None
    notes: str | None = None
    items: list[InventoryPurchaseItemCreate]


class InventoryPurchaseResponse(BaseModel):
    id: int
    purchase_date: date
    supplier_name: str | None
    supplier_contact: str | None
    total_cost: float | None
    notes: str | None
    items: list[InventoryPurchaseItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Stock Adjustment (simple in/out without a full purchase record) ──────────

class StockAdjustmentCreate(BaseModel):
    inventory_item_id: int
    # add | subtract
    direction: str
    quantity: float
    notes: str | None = None
