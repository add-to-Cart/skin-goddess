import os

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

# ── Production safety checks ─────────────────────────────────────────────────
# Fail loudly when deployed with insecure defaults rather than silently running
# with a known-weak signing key or a guessable admin password.

_ENV = os.getenv("APP_ENV", "development").lower()
_IS_PROD = _ENV == "production"

_INSECURE_KEYS = {
    "skingoddess-change-this-in-production",
    "skingoddess-change-this-secret-key-in-production-32chars",
    "",
}

if _IS_PROD:
    _secret = os.getenv("SECRET_KEY", "")
    if _secret in _INSECURE_KEYS:
        raise RuntimeError(
            "SECRET_KEY is not set or is using an insecure placeholder. "
            "Set a strong random value in your hosting dashboard before deploying."
        )

    _admin_pw = os.getenv("ADMIN_PASSWORD", "")
    if _admin_pw in ("", "admin123", "admin", "password", "123456"):
        raise RuntimeError(
            "ADMIN_PASSWORD is not set or is using a trivially guessable default. "
            "Set a strong password in your hosting dashboard before deploying."
        )

# ── CORS ──────────────────────────────────────────────────────────────────────
# In development, allow the local Vite dev server.
# In production, set CORS_ORIGINS to your actual frontend URL, e.g.:
#   CORS_ORIGINS=https://your-frontend.onrender.com
#
# Multiple origins can be separated by commas:
#   CORS_ORIGINS=https://frontend.onrender.com,https://clinic.example.com
#
# Wildcard ("*") is intentionally not supported with credentials.

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
_allowed_origins: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]


app = FastAPI(
    title="Skin Goddess Clinic System API",
    version="1.0.0",
    # Disable auto-generated docs in production to reduce attack surface.
    # Remove these two lines if you need Swagger/ReDoc in prod.
    docs_url=None if _IS_PROD else "/docs",
    redoc_url=None if _IS_PROD else "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health endpoint ───────────────────────────────────────────────────────────
# Used by Render, load-balancers, and the Windows launcher to verify the server
# is up. Returns only the version string — no secrets, no business data.

@app.get("/health", tags=["Health"], include_in_schema=not _IS_PROD)
def health():
    return {"status": "ok", "version": "1.0.0"}


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
