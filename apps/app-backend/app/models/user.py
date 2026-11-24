from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UserModel(Base):
    """SQLAlchemy model for users authentication table."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    google_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class RefreshTokenModel(Base):
    """SQLAlchemy model for refresh tokens table."""

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    family_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class OAuthSessionModel(Base):
    """SQLAlchemy model for agent OAuth sessions table."""

    __tablename__ = "oauth_sessions"

    session_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    sender_address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    state_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True, default="")
    code_verifier: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    redirect_uri: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")
    handoff_code: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    handoff_code_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
