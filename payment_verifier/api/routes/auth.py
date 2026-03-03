"""
Authentication routes
=====================
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.api.schemas.auth import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from payment_verifier.database.connection import get_session
from payment_verifier.database.models.user import (
    create_user,
    get_user_by_email,
    user_exists,
)
from payment_verifier.utilities.auth import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(
    request: UserRegisterRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    """Register a new user."""

    # Check if user already exists
    if await user_exists(session, request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user with hashed password
    password_hash = hash_password(request.password)
    user = await create_user(
        session,
        email=request.email,
        password_hash=password_hash,
    )

    # Generate token
    token = create_access_token(user.id)

    return TokenResponse(
        access_token=token,
        token_type="bearer",  # noqa
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: UserLoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    """Login a user."""

    # Find user by email
    user = await get_user_by_email(session, request.email)

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Generate token
    token = create_access_token(user.id)

    return TokenResponse(
        access_token=token,
        token_type="bearer",  # noqa
        user=UserResponse.model_validate(user),
    )
