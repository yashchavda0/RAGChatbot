"""
Authentication routes: register and login.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator

from config import settings
from services.postgres_service import get_postgres_service
from services.models import User

# ---- password hashing ----
import bcrypt

# ---- JWT ----
from jose import jwt

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24        # 1 day
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: dict


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest):
    pg = get_postgres_service()
    with pg.get_session() as db:
        existing = db.query(User).filter(User.email == body.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        user = User(
            email=body.email.lower(),
            full_name=body.full_name,
            hashed_password=_hash_password(body.password),
        )
        db.add(user)
        db.flush()  # get generated id without closing session
        db.refresh(user)
        user_id = user.id
        user_email = user.email
        user_full_name = user.full_name
        user_tier = user.subscription_tier
        user_created_at = user.created_at

    return _build_auth_response(user_id, user_email, user_full_name, user_tier, user_created_at)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    pg = get_postgres_service()
    with pg.get_session() as db:
        user = db.query(User).filter(User.email == body.email.lower()).first()
        if not user or not _verify_password(body.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )
        user_id = user.id
        user_email = user.email
        user_full_name = user.full_name
        user_tier = user.subscription_tier
        user_created_at = user.created_at

    return _build_auth_response(user_id, user_email, user_full_name, user_tier, user_created_at)


def _build_auth_response(user_id, email, full_name, subscription_tier, created_at) -> dict:
    access_token = _create_token(
        {"sub": user_id, "email": email},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = _create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "subscription_tier": subscription_tier,
            "created_at": created_at.isoformat() if created_at else None,
        },
    }
