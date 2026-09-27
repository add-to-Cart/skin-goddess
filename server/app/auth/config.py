"""
Auth configuration loaded from environment variables.

For production deployment, you MUST override every variable that has a
default here. The startup check in app/main.py (APP_ENV=production) will
refuse to start if SECRET_KEY or ADMIN_PASSWORD are using known-weak defaults.

Required env vars for production:
    SECRET_KEY              — long random string, e.g. from `secrets.token_hex(32)`
    ADMIN_USERNAME          — username for the single-admin login
    ADMIN_PASSWORD          — strong password, not a dictionary word
    ACCESS_TOKEN_EXPIRE_MINUTES  — optional, defaults to 480 (8 h)
"""

import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY: str = os.getenv(
    "SECRET_KEY",
    # This default is intentionally recognisable so it cannot be mistaken
    # for a real secret. The startup check rejects it in production.
    "skingoddess-change-this-in-production",
)
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")
)

# Single-admin model: all staff share one login.
# Limitation: no per-user audit trail, no role separation.
# Next step: introduce a `users` table when multi-user access is needed.
ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD: str = os.getenv(
    "ADMIN_PASSWORD",
    # "admin123" is the development default. The startup check rejects it
    # in production.
    "admin123",
)
