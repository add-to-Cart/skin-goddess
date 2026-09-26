"""
Invoice service
===============
Builds the invoice data context and renders the Jinja2 HTML template
into a PDF using xhtml2pdf.

The result is a raw bytes object (the PDF) — the caller decides whether
to stream it as a download or attach it to an email.
"""

import io
import os
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import select
from sqlalchemy.orm import Session
from xhtml2pdf import pisa

from app.models.client import Client
from app.models.payment import Payment
from app.models.sale import Sale, SaleItem

# Path to the templates directory
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

# ── Business info ─────────────────────────────────────────────────────────────
# These values are read from environment variables so you can change them
# without touching code. Defaults are provided as fallbacks.

BUSINESS_INFO = {
    "name":    os.getenv("BUSINESS_NAME",    "Skin Goddess Clinic"),
    "tagline": os.getenv("BUSINESS_TAGLINE", "Beauty & Aesthetic Services"),
    "address": os.getenv("BUSINESS_ADDRESS", ""),
    "phone":   os.getenv("BUSINESS_PHONE",   ""),
    "email":   os.getenv("BUSINESS_EMAIL",   ""),
}


def _fmt(value) -> str:
    """Format a numeric value as a 2-decimal string."""
    return f"{float(value):,.2f}"


def build_invoice_context(db: Session, sale_id: int) -> dict:
    """
    Fetch all data needed for the invoice and return a template context dict.
    Raises ValueError if the sale does not exist.
    """
    # Load sale with items eagerly
    sale = db.scalar(
        select(Sale).where(Sale.id == sale_id)
    )
    if not sale:
        raise ValueError(f"Sale {sale_id} not found")

    # Load client
    client = db.get(Client, sale.client_id)

    # Load payments ordered by date
    payments = db.scalars(
        select(Payment)
        .where(Payment.sale_id == sale_id)
        .order_by(Payment.payment_date)
    ).all()

    # Load sale items
    sale_items = db.scalars(
        select(SaleItem).where(SaleItem.sale_id == sale_id)
    ).all()

    total_paid = sum(float(p.amount) for p in payments)
    total_amount = float(sale.total_amount)
    remaining = total_amount - total_paid

    return {
        "business": BUSINESS_INFO,
        "invoice_number": f"INV-{sale.id:05d}",
        "sale_date": str(sale.sale_date),
        "payment_status": sale.payment_status,
        "client": {
            "full_name": f"{client.first_name} {client.last_name}" if client else "Unknown",
            "phone":   client.phone   if client else "",
            "email":   client.email   if client else "",
            "address": client.address if client else "",
        },
        "items": [
            {
                "description": item.description,
                "quantity":    _fmt(item.quantity),
                "unit_price":  _fmt(item.unit_price),
                "line_total":  _fmt(item.line_total),
            }
            for item in sale_items
        ],
        "payments": [
            {
                "payment_date":   str(p.payment_date),
                "payment_method": p.payment_method,
                "amount":         _fmt(p.amount),
            }
            for p in payments
        ],
        "total_amount":     _fmt(total_amount),
        "total_paid":       _fmt(total_paid),
        "remaining_balance": _fmt(remaining),
    }


def render_invoice_pdf(db: Session, sale_id: int) -> bytes:
    """
    Render the invoice as a PDF and return the raw bytes.
    """
    context = build_invoice_context(db, sale_id)

    # Render HTML from Jinja2 template
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))
    template = env.get_template("invoice.html")
    html_content = template.render(**context)

    # Convert HTML → PDF in memory
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(
        src=html_content,
        dest=pdf_buffer,
        encoding="utf-8",
    )

    if pisa_status.err:
        raise RuntimeError(f"PDF generation failed with error code {pisa_status.err}")

    pdf_buffer.seek(0)
    return pdf_buffer.read()
