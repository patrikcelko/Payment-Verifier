"""
Authentication routes
=====================
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.api.dependencies import get_current_user
from payment_verifier.api.schemas.auth import (
    ProfileUpdateRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from payment_verifier.database.connection import get_session
from payment_verifier.database.models.user import (
    User,
    create_user,
    get_user_by_email,
    user_exists,
)
from payment_verifier.utilities.auth import (
    create_access_token,
    hash_password,
    verify_password,
)
from payment_verifier.utilities.rate_limit import RATE_LIMIT_AUTH, limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
@limiter.limit(RATE_LIMIT_AUTH)
async def register(
    user_data: UserRegisterRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
) -> TokenResponse:
    """Register a new user."""

    # Check if user already exists
    if await user_exists(session, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user with hashed password
    password_hash = hash_password(user_data.password)
    user = await create_user(
        session,
        email=user_data.email,
        name=user_data.name,
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
@limiter.limit(RATE_LIMIT_AUTH)
async def login(
    credentials: UserLoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
) -> TokenResponse:
    """Login a user."""

    # Find user by email
    user = await get_user_by_email(session, credentials.email)

    if not user or not verify_password(credentials.password, user.password_hash):
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


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Update user profile (email and/or password)."""

    # Email update
    if request.email is not None and request.email != user.email:
        # Check if email already taken by another user
        if await user_exists(session, request.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        user.email = request.email

    # Name update
    if request.name is not None:
        user.name = request.name

    # Password update
    if request.new_password is not None:
        if request.current_password is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password required for password change",
            )

        if not verify_password(request.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid current password",
            )

        user.password_hash = hash_password(request.new_password)

    await session.commit()
    await session.refresh(user)

    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Get current authenticated user information."""

    return UserResponse.model_validate(user)
