from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.payment import Payment
from app.models.sale import Sale, SaleItem
from app.schemas.sale import (
    InvoiceSendRequest,
    SaleCreate,
    SaleResponse,
    SaleSummaryResponse,
    SaleUpdate,
)
from app.services.email_service import (
    EmailConfigurationError,
    EmailDeliveryError,
    send_invoice_email,
)
from app.services.invoice_service import build_invoice_context, render_invoice_pdf

router = APIRouter(
    prefix="/api/sales",
    tags=["Sales"],
    dependencies=[Depends(get_current_user)],
)


def _compute_summary(db: Session, sale: Sale) -> SaleSummaryResponse:
    total_paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.sale_id == sale.id
        )
    ) or 0.0

    return SaleSummaryResponse(
        id=sale.id,
        client_id=sale.client_id,
        sale_date=sale.sale_date,
        total_amount=float(sale.total_amount),
        total_paid=float(total_paid),
        remaining_balance=float(sale.total_amount) - float(total_paid),
        payment_status=sale.payment_status,
        notes=sale.notes,
    )


def _sync_payment_status(db: Session, sale: Sale) -> None:
    """Recompute and persist payment_status based on current payments."""
    total_paid = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.sale_id == sale.id
        )
    ) or 0.0

    total = float(sale.total_amount)
    paid = float(total_paid)

    if paid <= 0:
        sale.payment_status = "unpaid"
    elif paid >= total:
        sale.payment_status = "paid"
    else:
        sale.payment_status = "partial"


@router.post("", response_model=SaleResponse, status_code=201)
def create_sale(
    data: SaleCreate,
    db: Session = Depends(get_db),
):
    total = sum(item.quantity * item.unit_price for item in data.items)

    sale = Sale(
        client_id=data.client_id,
        sale_date=data.sale_date,
        total_amount=total,
        payment_status="unpaid",
        notes=data.notes,
    )
    db.add(sale)
    db.flush()

    for line in data.items:
        sale_item = SaleItem(
            sale_id=sale.id,
            procedure_id=line.procedure_id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            line_total=line.quantity * line.unit_price,
        )
        db.add(sale_item)

    db.commit()
    db.refresh(sale)
    return sale


@router.get("", response_model=list[SaleResponse])
def get_sales(
    client_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    payment_status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items))
        .order_by(Sale.sale_date.desc())
    )

    if client_id:
        stmt = stmt.where(Sale.client_id == client_id)
    if date_from:
        stmt = stmt.where(Sale.sale_date >= date_from)
    if date_to:
        stmt = stmt.where(Sale.sale_date <= date_to)
    if payment_status:
        stmt = stmt.where(Sale.payment_status == payment_status)

    return db.scalars(stmt).all()


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
):
    stmt = (
        select(Sale)
        .where(Sale.id == sale_id)
        .options(selectinload(Sale.items))
    )
    sale = db.scalar(stmt)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


@router.get("/{sale_id}/summary", response_model=SaleSummaryResponse)
def get_sale_summary(
    sale_id: int,
    db: Session = Depends(get_db),
):
    """Returns the sale with computed total_paid and remaining_balance."""
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return _compute_summary(db, sale)


@router.patch("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    data: SaleUpdate,
    db: Session = Depends(get_db),
):
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sale, field, value)

    db.commit()
    db.refresh(sale)
    return sale


# ── Invoice endpoints ─────────────────────────────────────────────────────────

@router.get("/{sale_id}/invoice", response_class=Response)
def download_invoice(
    sale_id: int,
    db: Session = Depends(get_db),
):
    """
    Generate and return the invoice for a sale as a downloadable PDF.

    The browser (or frontend fetch call) receives a PDF file with the
    Content-Disposition header set to attachment, so it triggers a download.
    """
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    try:
        pdf_bytes = render_invoice_pdf(db, sale_id)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Invoice PDF generation failed. Please try again later.",
        )

    invoice_number = f"INV-{sale_id:05d}"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice_number}.pdf"'
        },
    )


@router.post("/{sale_id}/send-invoice", status_code=200)
def send_invoice(
    sale_id: int,
    body: InvoiceSendRequest,
    db: Session = Depends(get_db),
):
    """
    Generate the invoice PDF and email it to the client.

    If body.recipient_email is provided it overrides the client's email on file.
    Returns 422 if no email address is available anywhere.
    """
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    # Resolve recipient email
    client = db.get(Client, sale.client_id)
    email = body.recipient_email or (client.email if client else None)

    if not email:
        raise HTTPException(
            status_code=422,
            detail=(
                "No email address available. "
                "Either add an email to the client profile or supply "
                "recipient_email in the request body."
            ),
        )

    try:
        pdf_bytes = render_invoice_pdf(db, sale_id)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Invoice PDF generation failed. Please try again later.",
        )

    try:
        ctx = build_invoice_context(db, sale_id)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Invoice details could not be prepared. Please try again later.",
        )

    try:
        send_invoice_email(
            recipient_email=email,
            recipient_name=ctx["client"]["full_name"],
            invoice_number=ctx["invoice_number"],
            pdf_bytes=pdf_bytes,
            sale_date=ctx["sale_date"],
            total_amount=ctx["total_amount"],
            remaining_balance=ctx["remaining_balance"],
            business_name=ctx["business"]["name"],
        )
    except EmailConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Invoice email could not be sent. Please try again later.",
        )

    return {
        "message": f"Invoice {ctx['invoice_number']} sent to {email}",
        "invoice_number": ctx["invoice_number"],
        "sent_to": email,
    }
