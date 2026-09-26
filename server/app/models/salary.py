from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class SalaryRecord(Base):
    """
    One record per salary release.

    The business has not yet finalized payroll calculation rules (monthly, daily,
    hourly, commission, basic+commission). This model stores the result — what
    was actually paid — along with enough context to support any of those
    arrangements once the rules are confirmed.
    """

    __tablename__ = "salary_records"

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False
    )

    # The period this salary covers
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Amount that was computed / approved for this period
    gross_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Any deductions (loans, absences, etc.)
    deductions: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )

    # Net = gross - deductions; stored explicitly for reference
    net_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Date the salary was actually released
    release_date: Mapped[date | None] = mapped_column(Date)

    # Status: pending, released
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
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
    employee: Mapped["Employee"] = relationship(back_populates="salary_records")
