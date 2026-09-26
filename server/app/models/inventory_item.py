from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class InventoryItem(Base):
    """
    A product the business stocks.

    Categories: medicine, supply, consumable, equipment, other
    Units: pcs, ml, g, box, bottle, pair, etc. — free text, business decides.

    current_quantity is the live stock level.
    It is updated when stock-in (InventoryPurchase / adjustment) or
    stock-out (ProcedureSupply / adjustment) transactions occur.
    """

    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    # medicine | supply | consumable | equipment | other
    category: Mapped[str | None] = mapped_column(String(50))

    # Unit of measure: pcs, ml, g, box, bottle, pair, set, etc.
    unit: Mapped[str | None] = mapped_column(String(50))

    current_quantity: Mapped[float] = mapped_column(
        Numeric(10, 3), nullable=False, default=0
    )

    # When stock drops to or below this level, show a low-stock indicator
    minimum_stock_level: Mapped[float | None] = mapped_column(Numeric(10, 3))

    # Most recent acquisition cost per unit — updated on each purchase
    acquisition_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))

    # Selling price or reference value — optional
    selling_price: Mapped[float | None] = mapped_column(Numeric(10, 2))

    description: Mapped[str | None] = mapped_column(Text)

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
    transactions: Mapped[list["InventoryTransaction"]] = relationship(
        back_populates="inventory_item", cascade="all, delete-orphan"
    )
    purchase_items: Mapped[list["InventoryPurchaseItem"]] = relationship(
        back_populates="inventory_item"
    )
    procedure_supplies: Mapped[list["ProcedureSupply"]] = relationship(
        back_populates="inventory_item"
    )
