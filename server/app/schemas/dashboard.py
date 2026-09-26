from pydantic import BaseModel


class LowStockItem(BaseModel):
    id: int
    name: str
    current_quantity: float
    minimum_stock_level: float | None
    unit: str | None


class UpcomingFollowUp(BaseModel):
    follow_up_id: int
    client_id: int
    client_name: str
    follow_up_date: str   # ISO date string
    procedure_name: str | None
    status: str


class DashboardResponse(BaseModel):
    """
    Summary data for the dashboard.
    All figures are for today unless otherwise noted.
    """
    # Sales
    todays_sales_total: float
    todays_sales_count: int

    # Clients
    clients_served_today: int
    new_clients_today: int

    # Payments
    outstanding_payments_total: float
    outstanding_payments_count: int

    # Follow-ups
    upcoming_follow_ups: list[UpcomingFollowUp]
    overdue_follow_ups_count: int

    # Inventory
    low_stock_items: list[LowStockItem]

    # Expenses
    todays_expenses_total: float

    # Attendance
    present_today: int
    absent_today: int
