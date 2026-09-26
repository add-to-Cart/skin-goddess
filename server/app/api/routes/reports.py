from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.expense import Expense
from app.models.follow_up import FollowUp
from app.models.inventory_item import InventoryItem
from app.models.inventory_transaction import InventoryTransaction
from app.models.payment import Payment
from app.models.procedure import Procedure
from app.models.procedure_supply import ProcedureSupply
from app.models.sale import Sale

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
    dependencies=[Depends(get_current_user)],
)


# ── Sales Reports ─────────────────────────────────────────────────────────────

@router.get("/sales/daily")
def report_sales_daily(
    report_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
):
    row = db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0).label("total"),
            func.count(Sale.id).label("count"),
        ).where(Sale.sale_date == report_date)
    ).one()

    return {
        "date": str(report_date),
        "total_sales": float(row.total),
        "transaction_count": int(row.count),
    }


@router.get("/sales/range")
def report_sales_range(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
):
    """Sales totals for an arbitrary date range — covers weekly/monthly."""
    row = db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0).label("total"),
            func.count(Sale.id).label("count"),
        ).where(
            Sale.sale_date >= date_from,
            Sale.sale_date <= date_to,
        )
    ).one()

    total_paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.sale_id.in_(
                select(Sale.id).where(
                    Sale.sale_date >= date_from,
                    Sale.sale_date <= date_to,
                )
            )
        )
    ) or 0.0

    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "total_sales": float(row.total),
        "transaction_count": int(row.count),
        "total_collected": float(total_paid),
        "total_outstanding": float(row.total) - float(total_paid),
    }


# ── Expense Reports ───────────────────────────────────────────────────────────

@router.get("/expenses/daily")
def report_expenses_daily(
    report_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
):
    total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date == report_date
        )
    ) or 0.0

    return {"date": str(report_date), "total_expenses": float(total)}


@router.get("/expenses/range")
def report_expenses_range(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
):
    total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= date_from,
            Expense.expense_date <= date_to,
        )
    ) or 0.0

    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "total_expenses": float(total),
    }


@router.get("/expenses/by-category")
def report_expenses_by_category(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(
        Expense.category,
        func.coalesce(func.sum(Expense.amount), 0).label("total"),
        func.count(Expense.id).label("count"),
    ).group_by(Expense.category)

    if date_from:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.expense_date <= date_to)

    rows = db.execute(stmt).all()

    return [
        {
            "category": row.category or "uncategorized",
            "total": float(row.total),
            "count": int(row.count),
        }
        for row in rows
    ]


# ── Inventory Reports ─────────────────────────────────────────────────────────

@router.get("/inventory/current-stock")
def report_inventory_current(
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(InventoryItem)
        .where(InventoryItem.is_active.is_(True))
        .order_by(InventoryItem.name)
    ).all()

    return [
        {
            "id": i.id,
            "name": i.name,
            "category": i.category,
            "unit": i.unit,
            "current_quantity": float(i.current_quantity),
            "minimum_stock_level": float(i.minimum_stock_level) if i.minimum_stock_level else None,
            "is_low_stock": (
                i.minimum_stock_level is not None
                and float(i.current_quantity) <= float(i.minimum_stock_level)
            ),
            "acquisition_cost": float(i.acquisition_cost) if i.acquisition_cost else None,
        }
        for i in items
    ]


@router.get("/inventory/usage-by-procedure")
def report_inventory_usage_by_procedure(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Total quantity and cost of each inventory item used across procedures.
    Optionally filtered by procedure date range.
    """
    stmt = (
        select(
            InventoryItem.id,
            InventoryItem.name,
            InventoryItem.unit,
            func.sum(ProcedureSupply.quantity_used).label("total_quantity"),
            func.sum(
                ProcedureSupply.quantity_used * ProcedureSupply.unit_cost_at_use
            ).label("total_cost"),
        )
        .join(ProcedureSupply, ProcedureSupply.inventory_item_id == InventoryItem.id)
        .join(Procedure, Procedure.id == ProcedureSupply.procedure_id)
        .group_by(InventoryItem.id, InventoryItem.name, InventoryItem.unit)
    )

    if date_from:
        stmt = stmt.where(Procedure.procedure_date >= date_from)
    if date_to:
        stmt = stmt.where(Procedure.procedure_date <= date_to)

    rows = db.execute(stmt).all()

    return [
        {
            "item_id": row.id,
            "item_name": row.name,
            "unit": row.unit,
            "total_quantity_used": float(row.total_quantity or 0),
            "total_cost": float(row.total_cost or 0),
        }
        for row in rows
    ]


@router.get("/inventory/usage-by-client")
def report_inventory_usage_by_client(
    client_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Supplies consumed per client — answers 'How much did this client cost us?'
    """
    stmt = (
        select(
            Procedure.client_id,
            InventoryItem.id,
            InventoryItem.name,
            InventoryItem.unit,
            func.sum(ProcedureSupply.quantity_used).label("total_quantity"),
            func.sum(
                ProcedureSupply.quantity_used * ProcedureSupply.unit_cost_at_use
            ).label("total_cost"),
        )
        .join(ProcedureSupply, ProcedureSupply.inventory_item_id == InventoryItem.id)
        .join(Procedure, Procedure.id == ProcedureSupply.procedure_id)
        .group_by(
            Procedure.client_id,
            InventoryItem.id,
            InventoryItem.name,
            InventoryItem.unit,
        )
    )

    if client_id:
        stmt = stmt.where(Procedure.client_id == client_id)

    rows = db.execute(stmt).all()

    return [
        {
            "client_id": row.client_id,
            "item_id": row.id,
            "item_name": row.name,
            "unit": row.unit,
            "total_quantity_used": float(row.total_quantity or 0),
            "total_cost": float(row.total_cost or 0),
        }
        for row in rows
    ]


# ── Client Reports ────────────────────────────────────────────────────────────

@router.get("/clients/outstanding-balances")
def report_outstanding_balances(
    db: Session = Depends(get_db),
):
    """Clients with unpaid or partially paid sales."""
    from app.models.client import Client

    rows = db.execute(
        select(
            Client.id,
            Client.first_name,
            Client.last_name,
            func.sum(Sale.total_amount).label("total_billed"),
            func.coalesce(
                db.scalar(
                    select(func.sum(Payment.amount)).where(
                        Payment.sale_id == Sale.id
                    )
                ),
                0,
            ).label("total_paid"),
        )
        .join(Sale, Sale.client_id == Client.id)
        .where(Sale.payment_status.in_(("unpaid", "partial")))
        .group_by(Client.id, Client.first_name, Client.last_name)
    ).all()

    # Simpler alternative using subquery approach — easier to read and extend
    from sqlalchemy import literal_column
    paid_subq = (
        select(
            Payment.sale_id,
            func.sum(Payment.amount).label("paid"),
        )
        .group_by(Payment.sale_id)
        .subquery()
    )

    result = db.execute(
        select(
            Client.id.label("client_id"),
            Client.first_name,
            Client.last_name,
            func.sum(Sale.total_amount).label("total_billed"),
            func.coalesce(func.sum(paid_subq.c.paid), 0).label("total_paid"),
        )
        .join(Sale, Sale.client_id == Client.id)
        .outerjoin(paid_subq, paid_subq.c.sale_id == Sale.id)
        .where(Sale.payment_status.in_(("unpaid", "partial")))
        .group_by(Client.id, Client.first_name, Client.last_name)
        .order_by(Client.last_name, Client.first_name)
    ).all()

    return [
        {
            "client_id": row.client_id,
            "client_name": f"{row.first_name} {row.last_name}",
            "total_billed": float(row.total_billed or 0),
            "total_paid": float(row.total_paid or 0),
            "remaining_balance": float(row.total_billed or 0) - float(row.total_paid or 0),
        }
        for row in result
    ]


@router.get("/clients/follow-ups")
def report_client_follow_ups(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    from app.models.client import Client

    stmt = (
        select(
            FollowUp.id,
            FollowUp.follow_up_date,
            FollowUp.status,
            Client.id.label("client_id"),
            Client.first_name,
            Client.last_name,
        )
        .join(Client, Client.id == FollowUp.client_id)
        .order_by(FollowUp.follow_up_date)
    )

    if status:
        stmt = stmt.where(FollowUp.status == status)

    rows = db.execute(stmt).all()

    return [
        {
            "follow_up_id": row.id,
            "follow_up_date": str(row.follow_up_date),
            "status": row.status,
            "client_id": row.client_id,
            "client_name": f"{row.first_name} {row.last_name}",
        }
        for row in rows
    ]
