from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth       import router as auth_router
from app.api.routes.attendance import router as attendance_router
from app.api.routes.clients    import router as clients_router
from app.api.routes.dashboard  import router as dashboard_router
from app.api.routes.employees  import router as employees_router
from app.api.routes.expenses   import router as expenses_router
from app.api.routes.follow_ups import router as follow_ups_router
from app.api.routes.inventory  import router as inventory_router
from app.api.routes.payments   import router as payments_router
from app.api.routes.procedures import router as procedures_router
from app.api.routes.reports    import router as reports_router
from app.api.routes.salary     import router as salary_router
from app.api.routes.sales      import router as sales_router
from app.api.routes.services   import router as services_router

app = FastAPI(
    title="Skin Goddess Clinic System API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Auth is public — must be registered first so the login endpoint is reachable.
app.include_router(auth_router)

# All business routers — protected at the route level via get_current_user.
app.include_router(dashboard_router)
app.include_router(clients_router)
app.include_router(services_router)
app.include_router(procedures_router)
app.include_router(follow_ups_router)
app.include_router(sales_router)
app.include_router(payments_router)
app.include_router(inventory_router)
app.include_router(expenses_router)
app.include_router(employees_router)
app.include_router(attendance_router)
app.include_router(salary_router)
app.include_router(reports_router)
