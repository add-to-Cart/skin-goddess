from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models.inventory_item import InventoryItem
from app.models.inventory_purchase import InventoryPurchase, InventoryPurchaseItem
from app.models.inventory_transaction import InventoryTransaction
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventoryPurchaseCreate,
    InventoryPurchaseResponse,
    InventoryTransactionResponse,
    StockAdjustmentCreate,
)

router = APIRouter(
    prefix="/api/inventory",
    tags=["Inventory"],
)


# ── Items ────────────────────────────────────────────────────────────────────

@router.post("/items", response_model=InventoryItemResponse, status_code=201)
def create_item(
    data: InventoryItemCreate,
    db: Session = Depends(get_db),
):
    item = InventoryItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _with_low_stock(item)


@router.get("/items", response_model=list[InventoryItemResponse])
def get_items(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    low_stock_only: bool = Query(default=False),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    stmt = select(InventoryItem).order_by(InventoryItem.name)

    if active_only:
        stmt = stmt.where(InventoryItem.is_active.is_(True))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                InventoryItem.name.ilike(pattern),
                InventoryItem.category.ilike(pattern),
            )
        )
    if category:
        stmt = stmt.where(InventoryItem.category == category)

    items = db.scalars(stmt).all()

    if low_stock_only:
        items = [
            i for i in items
            if i.minimum_stock_level is not None
            and float(i.current_quantity) <= float(i.minimum_stock_level)
        ]

    return [_with_low_stock(i) for i in items]


@router.get("/items/{item_id}", response_model=InventoryItemResponse)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.scalar(select(InventoryItem).where(InventoryItem.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _with_low_stock(item)


@router.patch("/items/{item_id}", response_model=InventoryItemResponse)
def update_item(
    item_id: int,
    data: InventoryItemUpdate,
    db: Session = Depends(get_db),
):
    item = db.scalar(select(InventoryItem).where(InventoryItem.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return _with_low_stock(item)


# ── Stock Adjustment ─────────────────────────────────────────────────────────

@router.post("/items/{item_id}/adjust", response_model=InventoryItemResponse)
def adjust_stock(
    item_id: int,
    data: StockAdjustmentCreate,
    db: Session = Depends(get_db),
):
    """
    Manual stock correction — add or subtract quantity without a purchase record.
    """
    item = db.scalar(select(InventoryItem).where(InventoryItem.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if data.direction == "add":
        item.current_quantity = float(item.current_quantity) + data.quantity
        tx_type = "adjustment_add"
    elif data.direction == "subtract":
        item.current_quantity = float(item.current_quantity) - data.quantity
        tx_type = "adjustment_sub"
    else:
        raise HTTPException(
            status_code=422,
            detail="direction must be 'add' or 'subtract'",
        )

    tx = InventoryTransaction(
        inventory_item_id=item.id,
        transaction_type=tx_type,
        quantity_change=data.quantity,
        quantity_after=float(item.current_quantity),
        reference_type="manual_adjustment",
        notes=data.notes,
    )
    db.add(tx)
    db.commit()
    db.refresh(item)
    return _with_low_stock(item)


# ── Transactions (history) ───────────────────────────────────────────────────

@router.get("/items/{item_id}/history", response_model=list[InventoryTransactionResponse])
def get_item_history(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.scalar(select(InventoryItem).where(InventoryItem.id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    stmt = (
        select(InventoryTransaction)
        .where(InventoryTransaction.inventory_item_id == item_id)
        .order_by(InventoryTransaction.created_at.desc())
    )
    return db.scalars(stmt).all()


@router.get("/transactions", response_model=list[InventoryTransactionResponse])
def get_all_transactions(
    item_id: int | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(InventoryTransaction).order_by(
        InventoryTransaction.created_at.desc()
    )

    if item_id:
        stmt = stmt.where(InventoryTransaction.inventory_item_id == item_id)
    if transaction_type:
        stmt = stmt.where(InventoryTransaction.transaction_type == transaction_type)
    if date_from:
        stmt = stmt.where(InventoryTransaction.created_at >= date_from)
    if date_to:
        stmt = stmt.where(InventoryTransaction.created_at <= date_to)

    return db.scalars(stmt).all()


# ── Purchases ────────────────────────────────────────────────────────────────

@router.post("/purchases", response_model=InventoryPurchaseResponse, status_code=201)
def create_purchase(
    data: InventoryPurchaseCreate,
    db: Session = Depends(get_db),
):
    """
    Record a purchase:
    1. Create the InventoryPurchase + InventoryPurchaseItem records.
    2. Increment current_quantity for each item.
    3. Write InventoryTransaction (stock_in) for each item.
    4. Update acquisition_cost on each item to the latest unit cost.
    """
    total = 0.0
    purchase = InventoryPurchase(
        purchase_date=data.purchase_date,
        supplier_name=data.supplier_name,
        supplier_contact=data.supplier_contact,
        notes=data.notes,
    )
    db.add(purchase)
    db.flush()

    for line in data.items:
        item = db.get(InventoryItem, line.inventory_item_id)
        if not item:
            raise HTTPException(
                status_code=404,
                detail=f"Inventory item {line.inventory_item_id} not found",
            )

        line_total = line.quantity * line.unit_cost
        total += line_total

        purchase_item = InventoryPurchaseItem(
            purchase_id=purchase.id,
            inventory_item_id=line.inventory_item_id,
            quantity=line.quantity,
            unit_cost=line.unit_cost,
            line_total=line_total,
        )
        db.add(purchase_item)

        # Update stock
        item.current_quantity = float(item.current_quantity) + line.quantity
        item.acquisition_cost = line.unit_cost  # refresh to latest cost

        tx = InventoryTransaction(
            inventory_item_id=item.id,
            transaction_type="stock_in",
            quantity_change=line.quantity,
            quantity_after=float(item.current_quantity),
            reference_type="inventory_purchase",
            reference_id=purchase.id,
            notes=f"Purchase from {data.supplier_name or 'supplier'}",
        )
        db.add(tx)

    purchase.total_cost = total
    db.commit()
    db.refresh(purchase)
    return purchase


@router.get("/purchases", response_model=list[InventoryPurchaseResponse])
def get_purchases(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = (
        select(InventoryPurchase)
        .options(selectinload(InventoryPurchase.items))
        .order_by(InventoryPurchase.purchase_date.desc())
    )

    if date_from:
        stmt = stmt.where(InventoryPurchase.purchase_date >= date_from)
    if date_to:
        stmt = stmt.where(InventoryPurchase.purchase_date <= date_to)

    return db.scalars(stmt).all()


@router.get("/purchases/{purchase_id}", response_model=InventoryPurchaseResponse)
def get_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
):
    stmt = (
        select(InventoryPurchase)
        .where(InventoryPurchase.id == purchase_id)
        .options(selectinload(InventoryPurchase.items))
    )
    purchase = db.scalar(stmt)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase


# ── Internal helper ──────────────────────────────────────────────────────────

def _with_low_stock(item: InventoryItem) -> dict:
    """Attach computed is_low_stock field to response."""
    data = InventoryItemResponse.model_validate(item)
    if (
        item.minimum_stock_level is not None
        and float(item.current_quantity) <= float(item.minimum_stock_level)
    ):
        data.is_low_stock = True
    return data
