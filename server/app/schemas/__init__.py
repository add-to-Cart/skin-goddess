# Re-export all schemas for convenient importing across the project.

from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceResponse,
    AttendanceUpdate,
)
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.schemas.dashboard import DashboardResponse
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.schemas.follow_up import FollowUpCreate, FollowUpResponse, FollowUpUpdate
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventoryPurchaseCreate,
    InventoryPurchaseResponse,
    InventoryTransactionResponse,
    StockAdjustmentCreate,
)
from app.schemas.payment import (
    PaymentCreate,
    PaymentHistoryResponse,
    PaymentResponse,
    PaymentUpdate,
)
from app.schemas.procedure import (
    ProcedureCreate,
    ProcedureResponse,
    ProcedureSupplyCreate,
    ProcedureSupplyResponse,
    ProcedureUpdate,
)
from app.schemas.salary import (
    SalaryRecordCreate,
    SalaryRecordResponse,
    SalaryRecordUpdate,
)
from app.schemas.sale import (
    SaleCreate,
    SaleResponse,
    SaleSummaryResponse,
    SaleUpdate,
)
from app.schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate

__all__ = [
    "AttendanceCreate", "AttendanceResponse", "AttendanceUpdate",
    "ClientCreate", "ClientResponse", "ClientUpdate",
    "DashboardResponse",
    "EmployeeCreate", "EmployeeResponse", "EmployeeUpdate",
    "ExpenseCreate", "ExpenseResponse", "ExpenseUpdate",
    "FollowUpCreate", "FollowUpResponse", "FollowUpUpdate",
    "InventoryItemCreate", "InventoryItemResponse", "InventoryItemUpdate",
    "InventoryPurchaseCreate", "InventoryPurchaseResponse",
    "InventoryTransactionResponse",
    "StockAdjustmentCreate",
    "PaymentCreate", "PaymentHistoryResponse", "PaymentResponse", "PaymentUpdate",
    "ProcedureCreate", "ProcedureResponse",
    "ProcedureSupplyCreate", "ProcedureSupplyResponse",
    "ProcedureUpdate",
    "SalaryRecordCreate", "SalaryRecordResponse", "SalaryRecordUpdate",
    "SaleCreate", "SaleResponse", "SaleSummaryResponse", "SaleUpdate",
    "ServiceCreate", "ServiceResponse", "ServiceUpdate",
]
