from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.client import Client
from app.models.expense import Expense
from app.models.follow_up import FollowUp
from app.models.inventory_item import InventoryItem
from app.models.payment import Payment
from app.models.procedure import Procedure
from app.models.sale import Sale
from app.schemas.dashboard import DashboardResponse, LowStockItem, UpcomingFollowUp

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
):
    today = date.today()
    upcoming_cutoff = today + timedelta(days=7)

    # ── Sales ────────────────────────────────────────────────────────────────
    todays_sales = db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.count(Sale.id),
        ).where(Sale.sale_date == today)
    ).one()

    # ── Clients ──────────────────────────────────────────────────────────────
    clients_served_today = db.scalar(
        select(func.count(func.distinct(Procedure.client_id))).where(
            Procedure.procedure_date == today
        )
    ) or 0

    new_clients_today = db.scalar(
        select(func.count(Client.id)).where(
            func.date(Client.created_at) == today
        )
    ) or 0

    # ── Payments / Outstanding ───────────────────────────────────────────────
    outstanding_sales = db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.count(Sale.id),
        ).where(Sale.payment_status.in_(("unpaid", "partial")))
    ).one()

    # Subtract what has already been paid toward those outstanding sales
    paid_toward_outstanding = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.sale_id.in_(
                select(Sale.id).where(
                    Sale.payment_status.in_(("unpaid", "partial"))
                )
            )
        )
    ) or 0.0

    outstanding_total = float(outstanding_sales[0]) - float(paid_toward_outstanding)

    # ── Follow-ups ───────────────────────────────────────────────────────────
    upcoming_raw = db.execute(
        select(
            FollowUp.id,
            FollowUp.client_id,
            FollowUp.follow_up_date,
            FollowUp.status,
            Client.first_name,
            Client.last_name,
        )
        .join(Client, Client.id == FollowUp.client_id)
        .where(
            FollowUp.follow_up_date >= today,
            FollowUp.follow_up_date <= upcoming_cutoff,
            FollowUp.status.in_(("upcoming", "due")),
        )
        .order_by(FollowUp.follow_up_date)
        .limit(10)
    ).all()

    upcoming_follow_ups = [
        UpcomingFollowUp(
            follow_up_id=row.id,
            client_id=row.client_id,
            client_name=f"{row.first_name} {row.last_name}",
            follow_up_date=str(row.follow_up_date),
            procedure_name=None,  # can be joined later when needed
            status=row.status,
        )
        for row in upcoming_raw
    ]

    overdue_count = db.scalar(
        select(func.count(FollowUp.id)).where(
            FollowUp.follow_up_date < today,
            FollowUp.status.in_(("upcoming", "due")),
        )
    ) or 0

    # ── Inventory — low stock ─────────────────────────────────────────────────
    low_stock_rows = db.scalars(
        select(InventoryItem).where(
            InventoryItem.is_active.is_(True),
            InventoryItem.minimum_stock_level.is_not(None),
            InventoryItem.current_quantity <= InventoryItem.minimum_stock_level,
        )
    ).all()

    low_stock_items = [
        LowStockItem(
            id=i.id,
            name=i.name,
            current_quantity=float(i.current_quantity),
            minimum_stock_level=float(i.minimum_stock_level) if i.minimum_stock_level else None,
            unit=i.unit,
        )
        for i in low_stock_rows
    ]

    # ── Expenses ─────────────────────────────────────────────────────────────
    todays_expenses = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date == today
        )
    ) or 0.0

    # ── Attendance ───────────────────────────────────────────────────────────
    present_today = db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.attendance_date == today,
            Attendance.status.in_(("present", "late")),
        )
    ) or 0

    absent_today = db.scalar(
        select(func.count(Attendance.id)).where(
            Attendance.attendance_date == today,
            Attendance.status == "absent",
        )
    ) or 0

    return DashboardResponse(
        todays_sales_total=float(todays_sales[0]),
        todays_sales_count=int(todays_sales[1]),
        clients_served_today=clients_served_today,
        new_clients_today=new_clients_today,
        outstanding_payments_total=max(outstanding_total, 0.0),
        outstanding_payments_count=int(outstanding_sales[1]),
        upcoming_follow_ups=upcoming_follow_ups,
        overdue_follow_ups_count=overdue_count,
        low_stock_items=low_stock_items,
        todays_expenses_total=float(todays_expenses),
        present_today=present_today,
        absent_today=absent_today,
    )
