from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False
    )

    attendance_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Status values: present, late, absent, leave
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="present"
    )

    time_in: Mapped[time | None] = mapped_column(Time(timezone=False))
    time_out: Mapped[time | None] = mapped_column(Time(timezone=False))

    # Overtime hours if applicable — stored as a decimal (e.g. 1.5 = 1h30m)
    overtime_hours: Mapped[float | None] = mapped_column(Numeric(5, 2))

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
    employee: Mapped["Employee"] = relationship(back_populates="attendance_records")
