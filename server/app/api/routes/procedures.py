from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.inventory_item import InventoryItem
from app.models.inventory_transaction import InventoryTransaction
from app.models.procedure import Procedure
from app.models.procedure_supply import ProcedureSupply
from app.schemas.procedure import (
    ProcedureCreate,
    ProcedureResponse,
    ProcedureSupplyCreate,
    ProcedureSupplyResponse,
    ProcedureUpdate,
)

router = APIRouter(
    prefix="/api/procedures",
    tags=["Procedures"],
    dependencies=[Depends(get_current_user)],
)


def _load_procedure(db: Session, procedure_id: int) -> Procedure:
    stmt = (
        select(Procedure)
        .where(Procedure.id == procedure_id)
        .options(selectinload(Procedure.supplies_used))
    )
    procedure = db.scalar(stmt)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    return procedure


@router.post("", response_model=ProcedureResponse, status_code=201)
def create_procedure(
    data: ProcedureCreate,
    db: Session = Depends(get_db),
):
    supplies_data = data.supplies
    procedure_data = data.model_dump(exclude={"supplies"})

    procedure = Procedure(**procedure_data)
    db.add(procedure)
    db.flush()  # get the procedure.id before adding supplies

    for supply in supplies_data:
        _add_supply(db, procedure.id, supply)

    db.commit()
    db.refresh(procedure)
    return procedure


@router.get("", response_model=list[ProcedureResponse])
def get_procedures(
    client_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Procedure)
        .options(selectinload(Procedure.supplies_used))
        .order_by(Procedure.procedure_date.desc())
    )

    if client_id:
        stmt = stmt.where(Procedure.client_id == client_id)
    if date_from:
        stmt = stmt.where(Procedure.procedure_date >= date_from)
    if date_to:
        stmt = stmt.where(Procedure.procedure_date <= date_to)

    return db.scalars(stmt).all()


@router.get("/{procedure_id}", response_model=ProcedureResponse)
def get_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
):
    return _load_procedure(db, procedure_id)


@router.patch("/{procedure_id}", response_model=ProcedureResponse)
def update_procedure(
    procedure_id: int,
    data: ProcedureUpdate,
    db: Session = Depends(get_db),
):
    procedure = _load_procedure(db, procedure_id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(procedure, field, value)

    db.commit()
    db.refresh(procedure)
    return procedure


# ── Supplies sub-resource ────────────────────────────────────────────────────

@router.post(
    "/{procedure_id}/supplies",
    response_model=ProcedureSupplyResponse,
    status_code=201,
)
def add_supply_to_procedure(
    procedure_id: int,
    data: ProcedureSupplyCreate,
    db: Session = Depends(get_db),
):
    _load_procedure(db, procedure_id)  # confirm procedure exists
    supply = _add_supply(db, procedure_id, data)
    db.commit()
    db.refresh(supply)
    return supply


@router.delete("/{procedure_id}/supplies/{supply_id}", status_code=204)
def remove_supply_from_procedure(
    procedure_id: int,
    supply_id: int,
    db: Session = Depends(get_db),
):
    supply = db.scalar(
        select(ProcedureSupply).where(
            ProcedureSupply.id == supply_id,
            ProcedureSupply.procedure_id == procedure_id,
        )
    )
    if not supply:
        raise HTTPException(status_code=404, detail="Supply record not found")

    # Reverse the inventory deduction
    item = db.get(InventoryItem, supply.inventory_item_id)
    if item:
        item.current_quantity += float(supply.quantity_used)
        _record_transaction(
            db,
            item_id=item.id,
            tx_type="adjustment_add",
            qty=float(supply.quantity_used),
            qty_after=float(item.current_quantity),
            ref_type="procedure_supply_removal",
            ref_id=supply_id,
            notes=f"Reversed: supply removed from procedure {procedure_id}",
        )

    db.delete(supply)
    db.commit()


# ── Internal helpers ─────────────────────────────────────────────────────────

def _add_supply(
    db: Session,
    procedure_id: int,
    data: ProcedureSupplyCreate,
) -> ProcedureSupply:
    """
    Create a ProcedureSupply record, deduct inventory, and write a transaction.
    """
    item = db.get(InventoryItem, data.inventory_item_id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"Inventory item {data.inventory_item_id} not found",
        )

    unit_cost = data.unit_cost_at_use or (
        float(item.acquisition_cost) if item.acquisition_cost else None
    )

    supply = ProcedureSupply(
        procedure_id=procedure_id,
        inventory_item_id=data.inventory_item_id,
        quantity_used=data.quantity_used,
        unit_cost_at_use=unit_cost,
        notes=data.notes,
    )
    db.add(supply)
    db.flush()

    # Deduct from inventory
    item.current_quantity = float(item.current_quantity) - data.quantity_used

    _record_transaction(
        db,
        item_id=item.id,
        tx_type="stock_out",
        qty=data.quantity_used,
        qty_after=float(item.current_quantity),
        ref_type="procedure_supply",
        ref_id=supply.id,
        notes=f"Used in procedure {procedure_id}",
    )

    return supply


def _record_transaction(
    db: Session,
    item_id: int,
    tx_type: str,
    qty: float,
    qty_after: float,
    ref_type: str | None = None,
    ref_id: int | None = None,
    notes: str | None = None,
) -> None:
    tx = InventoryTransaction(
        inventory_item_id=item_id,
        transaction_type=tx_type,
        quantity_change=qty,
        quantity_after=qty_after,
        reference_type=ref_type,
        reference_id=ref_id,
        notes=notes,
    )
    db.add(tx)
