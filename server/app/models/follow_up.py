from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class FollowUp(Base):
    """
    A follow-up reminder for a client after a procedure.

    Status values:
        upcoming  — scheduled in the future, not yet due
        due       — today or overdue, not yet completed
        completed — the client came back / was contacted
        cancelled — no longer relevant

    The owner can use this to answer: "Who needs to come back soon?"
    """

    __tablename__ = "follow_ups"

    id: Mapped[int] = mapped_column(primary_key=True)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id"), nullable=False
    )
    procedure_id: Mapped[int | None] = mapped_column(
        ForeignKey("procedures.id")
    )

    follow_up_date: Mapped[date] = mapped_column(Date, nullable=False)

    # upcoming | due | completed | cancelled
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="upcoming"
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
    client: Mapped["Client"] = relationship(back_populates="follow_ups")
    procedure: Mapped["Procedure | None"] = relationship(back_populates="follow_ups")
