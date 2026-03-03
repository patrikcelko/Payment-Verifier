"""
User model
==========
"""

import datetime

from sqlalchemy import DateTime, String, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from payment_verifier.database.models.base import Base


class User(Base):
    """System user with authentication credentials."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    """Primary key for the user."""

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True)
    """Email address, unique and required."""

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    """User's display name."""

    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    """Hashed password using bcrypt."""

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    """Whether the user account is active."""

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    """Timestamp when the user was created."""

    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    """Timestamp when the user was last updated."""

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email!r}, name={self.name!r})>"


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    """Return a user by email, or None."""

    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    """Return a user by primary key, or None."""

    return await session.get(User, user_id)


async def create_user(session: AsyncSession, *, email: str, name: str, password_hash: str) -> User:
    """Insert a new user and return it."""

    user = User(email=email, name=name, password_hash=password_hash)
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


async def user_exists(session: AsyncSession, email: str) -> bool:
    """Check if a user with the given email exists."""

    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None
