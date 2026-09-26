from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class InventoryTransaction(Base):
    """
    Every movement of inventory — in or out — is recorded here.
    This is the inventory history / audit trail.

    transaction_type values:
        stock_in        — purchased / received
        stock_out       — used in a procedure (via ProcedureSupply)
        adjustment_add  — manual correction adding stock
        adjustment_sub  — manual correction removing stock

    quantity_change is always positive. The transaction_type determines
    whether it adds to or subtracts from current_quantity.

    reference_id is optional — links to the source record (ProcedureSupply,
    InventoryPurchase, etc.) for drill-down in reports.
    """

    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)

    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_items.id"), nullable=False
    )

    # stock_in | stock_out | adjustment_add | adjustment_sub
    transaction_type: Mapped[str] = mapped_column(String(30), nullable=False)

    quantity_change: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)

    # Quantity after this transaction (snapshot for history)
    quantity_after: Mapped[float | None] = mapped_column(Numeric(10, 3))

    # Optional link to what caused this transaction
    # (ProcedureSupply id, InventoryPurchase id, etc.)
    reference_type: Mapped[str | None] = mapped_column(String(50))
    reference_id: Mapped[int | None] = mapped_column()

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    inventory_item: Mapped["InventoryItem"] = relationship(
        back_populates="transactions"
    )
