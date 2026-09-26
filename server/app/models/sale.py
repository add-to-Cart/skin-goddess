from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Sale(Base):
    """
    A sale transaction — what the client owes for services received.

    One sale can contain multiple line items (SaleItem), each linked to a
    procedure or a standalone product/service charge.

    total_amount is the full price.
    Payments are recorded in the Payment table.
    remaining_balance = total_amount - sum(payments)
    That calculation happens at the service layer, not stored directly here
    (to avoid sync issues), but can be a computed property when needed.
    """

    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id"), nullable=False
    )

    sale_date: Mapped[date] = mapped_column(Date, nullable=False)

    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # payment_status: unpaid | partial | paid
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unpaid"
    )

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="sales")
    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )


class SaleItem(Base):
    """
    One line item within a Sale.

    A line item is typically a procedure charge, but can also be a standalone
    product or additional fee. procedure_id is optional — not every charge
    is tied to a procedure record.
    """

    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.id"), nullable=False
    )
    procedure_id: Mapped[int | None] = mapped_column(
        ForeignKey("procedures.id")
    )

    description: Mapped[str] = mapped_column(String(300), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    sale: Mapped["Sale"] = relationship(back_populates="items")
    procedure: Mapped["Procedure | None"] = relationship(back_populates="sale_items")
