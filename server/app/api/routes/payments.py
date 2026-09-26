from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.payment import Payment
from app.models.sale import Sale
from app.schemas.payment import (
    PaymentCreate,
    PaymentHistoryResponse,
    PaymentResponse,
    PaymentUpdate,
)

router = APIRouter(
    prefix="/api/payments",
    tags=["Payments"],
    dependencies=[Depends(get_current_user)],
)


def _sync_sale_status(db: Session, sale: Sale) -> None:
    total_paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.sale_id == sale.id
        )
    ) or 0.0

    paid = float(total_paid)
    total = float(sale.total_amount)

    if paid <= 0:
        sale.payment_status = "unpaid"
    elif paid >= total:
        sale.payment_status = "paid"
    else:
        sale.payment_status = "partial"


@router.post("", response_model=PaymentResponse, status_code=201)
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
):
    sale = db.scalar(select(Sale).where(Sale.id == data.sale_id))
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    payment = Payment(**data.model_dump())
    db.add(payment)
    db.flush()

    _sync_sale_status(db, sale)

    db.commit()
    db.refresh(payment)
    return payment


@router.get("", response_model=list[PaymentResponse])
def get_payments(
    sale_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = select(Payment).order_by(Payment.payment_date.desc())
    if sale_id:
        stmt = stmt.where(Payment.sale_id == sale_id)
    return db.scalars(stmt).all()


@router.get("/sale/{sale_id}", response_model=PaymentHistoryResponse)
def get_payment_history(
    sale_id: int,
    db: Session = Depends(get_db),
):
    """
    Full payment history for a sale, with running balance.
    This is the endpoint the client profile payment panel will use.
    """
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    payments = db.scalars(
        select(Payment)
        .where(Payment.sale_id == sale_id)
        .order_by(Payment.payment_date)
    ).all()

    total_paid = sum(float(p.amount) for p in payments)

    return PaymentHistoryResponse(
        sale_id=sale.id,
        total_amount=float(sale.total_amount),
        total_paid=total_paid,
        remaining_balance=float(sale.total_amount) - total_paid,
        payment_status=sale.payment_status,
        payments=payments,
    )


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.scalar(select(Payment).where(Payment.id == payment_id))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    data: PaymentUpdate,
    db: Session = Depends(get_db),
):
    payment = db.scalar(select(Payment).where(Payment.id == payment_id))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)

    # Re-sync the parent sale's payment_status after any amount change
    sale = db.get(Sale, payment.sale_id)
    if sale:
        _sync_sale_status(db, sale)

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{payment_id}", status_code=204)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    payment = db.scalar(select(Payment).where(Payment.id == payment_id))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    sale = db.get(Sale, payment.sale_id)

    db.delete(payment)
    db.flush()

    if sale:
        _sync_sale_status(db, sale)

    db.commit()
