"""
FastAPI dependencies
====================
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.connection import get_session
from payment_verifier.database.models.user import get_user_by_id
from payment_verifier.utilities.auth import decode_access_token

__all__ = ["DBSession", "get_current_user"]

DBSession = Annotated[AsyncSession, Depends(get_session)]
"""Injecting an async database session via FastAPI DI."""

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    """Get the current user from the JWT token."""
    from payment_verifier.database.models.user import User

    token = credentials.credentials

    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user: User | None = await get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return user
