# Import all models here so SQLAlchemy's mapper and Alembic's autogenerate
# can discover every table when they inspect Base.metadata.
#
# Rule: every new model file must be imported in this module.

from app.models.attendance import Attendance
from app.models.client import Client
from app.models.employee import Employee
from app.models.expense import Expense
from app.models.follow_up import FollowUp
from app.models.inventory_item import InventoryItem
from app.models.inventory_purchase import InventoryPurchase, InventoryPurchaseItem
from app.models.inventory_transaction import InventoryTransaction
from app.models.payment import Payment
from app.models.procedure import Procedure
from app.models.procedure_supply import ProcedureSupply
from app.models.salary import SalaryRecord
from app.models.sale import Sale, SaleItem
from app.models.service import Service

__all__ = [
    "Attendance",
    "Client",
    "Employee",
    "Expense",
    "FollowUp",
    "InventoryItem",
    "InventoryPurchase",
    "InventoryPurchaseItem",
    "InventoryTransaction",
    "Payment",
    "Procedure",
    "ProcedureSupply",
    "SalaryRecord",
    "Sale",
    "SaleItem",
    "Service",
]
