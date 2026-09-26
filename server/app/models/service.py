from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Service(Base):
    """
    The menu of services/procedures the business offers.
    Examples: Facial, Laser, Chemical Peel, etc.

    A Service is the template. A Procedure is what actually happened
    to a specific client on a specific date.
    """

    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # Default price — can be overridden at the procedure level
    default_price: Mapped[float | None] = mapped_column(Numeric(10, 2))

    # Estimated duration in minutes — informational only for now
    duration_minutes: Mapped[int | None] = mapped_column()

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

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
    procedures: Mapped[list["Procedure"]] = relationship(back_populates="service")
