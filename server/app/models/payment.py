from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Payment(Base):
    """
    One payment installment toward a Sale.

    A single sale can have multiple Payment records.

    Example:
        Sale total:  ₱10,000
        Payment 1:   ₱3,000  (2025-01-10)
        Payment 2:   ₱2,000  (2025-01-17)
        Payment 3:   ₱2,000  (2025-02-01)
        Remaining:   ₱3,000

    The remaining balance is:
        sale.total_amount - SUM(payments where sale_id = sale.id)

    payment_method values: cash | gcash | bank_transfer | card | other
    """

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)

    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.id"), nullable=False
    )

    payment_date: Mapped[date] = mapped_column(Date, nullable=False)

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # cash | gcash | bank_transfer | card | other
    payment_method: Mapped[str | None] = mapped_column(String(50))

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
    sale: Mapped["Sale"] = relationship(back_populates="payments")
