from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class ProcedureSupply(Base):
    """
    Records which inventory items were used in a specific procedure and how many.

    Example:
        Procedure: Facial for Maria Santos
        - Serum      × 1
        - Gloves     × 1
        - Cotton     × 5

    When this record is created, inventory quantity should be decremented
    and an InventoryTransaction (type=usage) should be created.
    That deduction is handled at the service/router level, not here in the model.
    """

    __tablename__ = "procedure_supplies"

    id: Mapped[int] = mapped_column(primary_key=True)

    procedure_id: Mapped[int] = mapped_column(
        ForeignKey("procedures.id"), nullable=False
    )
    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_items.id"), nullable=False
    )

    quantity_used: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)

    # Snapshot of cost at the time of use — for cost reporting even if price changes later
    unit_cost_at_use: Mapped[float | None] = mapped_column(Numeric(10, 2))

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    procedure: Mapped["Procedure"] = relationship(back_populates="supplies_used")
    inventory_item: Mapped["InventoryItem"] = relationship(
        back_populates="procedure_supplies"
    )
