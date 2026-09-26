"""
POST /api/auth/login   — exchange username+password for a JWT
GET  /api/auth/me      — return current user info (requires auth)
POST /api/auth/logout  — client-side only; endpoint exists for future token blacklisting
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.auth.config import ADMIN_USERNAME, ADMIN_PASSWORD
from app.auth.security import create_access_token, verify_password, hash_password
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Hashed lazily on first login attempt to avoid import-time errors.
_ADMIN_HASHED_PASSWORD: str | None = None


def _get_hashed_admin_pw() -> str:
    global _ADMIN_HASHED_PASSWORD
    if _ADMIN_HASHED_PASSWORD is None:
        _ADMIN_HASHED_PASSWORD = hash_password(ADMIN_PASSWORD)
    return _ADMIN_HASHED_PASSWORD


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 password flow.
    Accepts application/x-www-form-urlencoded with username + password fields.
    Returns a JWT access token valid for ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    # Case-insensitive username comparison
    if form_data.username.lower() != ADMIN_USERNAME.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
        )

    if not verify_password(form_data.password, _get_hashed_admin_pw()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
        )

    token = create_access_token(
        data={"sub": ADMIN_USERNAME, "role": "admin"}
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        username=ADMIN_USERNAME,
        role="admin",
    )


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Returns the current authenticated user's info."""
    return {
        "username": current_user.get("sub"),
        "role": current_user.get("role", "admin"),
    }


@router.post("/logout", status_code=204)
def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout endpoint. The client should discard the token.
    Token blacklisting can be added here in the future if needed.
    """
    return None
