from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class InventoryPurchase(Base):
    """
    A purchase order / restocking event.

    One purchase can contain multiple items (InventoryPurchaseItem).
    After recording a purchase, inventory quantities should be incremented
    and InventoryTransaction records (type=stock_in) should be created.
    That logic lives at the service/router level.

    Example:
        Serum:  20 units × ₱500 = ₱10,000
        Gloves: 50 units × ₱20  = ₱1,000
        Total purchase: ₱11,000
    """

    __tablename__ = "inventory_purchases"

    id: Mapped[int] = mapped_column(primary_key=True)

    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)

    supplier_name: Mapped[str | None] = mapped_column(String(200))
    supplier_contact: Mapped[str | None] = mapped_column(String(200))

    # Sum of all line items — stored for fast reporting
    total_cost: Mapped[float | None] = mapped_column(Numeric(10, 2))

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
    items: Mapped[list["InventoryPurchaseItem"]] = relationship(
        back_populates="purchase", cascade="all, delete-orphan"
    )


class InventoryPurchaseItem(Base):
    """
    One line item within an InventoryPurchase.
    Quantity and unit cost for a specific inventory item.
    """

    __tablename__ = "inventory_purchase_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    purchase_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_purchases.id"), nullable=False
    )
    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_items.id"), nullable=False
    )

    quantity: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Computed: quantity × unit_cost — stored for convenience
    line_total: Mapped[float | None] = mapped_column(Numeric(10, 2))

    # Relationships
    purchase: Mapped["InventoryPurchase"] = relationship(back_populates="items")
    inventory_item: Mapped["InventoryItem"] = relationship(
        back_populates="purchase_items"
    )
