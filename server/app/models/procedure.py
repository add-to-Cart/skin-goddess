from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Procedure(Base):
    """
    A procedure is what actually happened to a client on a specific date.
    It is an instance of a Service performed on a Client by an Employee.

    One client can have multiple procedures over time (session 1, session 2, etc.)
    """

    __tablename__ = "procedures"

    id: Mapped[int] = mapped_column(primary_key=True)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id"), nullable=False
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id"), nullable=False
    )
    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id")
    )

    procedure_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Which session number this is for this client for this service
    session_number: Mapped[int | None] = mapped_column(Integer)

    # The price charged for this specific procedure (may differ from service default)
    price: Mapped[float | None] = mapped_column(Numeric(10, 2))

    next_follow_up: Mapped[date | None] = mapped_column(Date)

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
    client: Mapped["Client"] = relationship(back_populates="procedures")
    service: Mapped["Service"] = relationship(back_populates="procedures")
    employee: Mapped["Employee | None"] = relationship(back_populates="procedures")
    supplies_used: Mapped[list["ProcedureSupply"]] = relationship(
        back_populates="procedure", cascade="all, delete-orphan"
    )
    follow_ups: Mapped[list["FollowUp"]] = relationship(
        back_populates="procedure", cascade="all, delete-orphan"
    )
    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="procedure")
