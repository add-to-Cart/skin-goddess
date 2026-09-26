from datetime import date, datetime

from sqlalchemy import Date, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class Expense(Base):
    """
    A business expense.

    category values (flexible — business may add more):
        inventory | supplies | rent | utilities | salary | equipment | other
    """

    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)

    expense_date: Mapped[date] = mapped_column(Date, nullable=False)

    description: Mapped[str] = mapped_column(String(300), nullable=False)

    # inventory | supplies | rent | utilities | salary | equipment | other
    category: Mapped[str | None] = mapped_column(String(50))

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

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
