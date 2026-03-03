"""
Authentication schemas
======================
"""

import re

from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_password_strength(password: str) -> str:
    """Validate password meets strength requirements."""

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")

    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")

    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one number")

    return password


class UserRegisterRequest(BaseModel):
    """User registration request."""

    email: EmailStr
    """Users email address, used for login and identification."""

    name: str = Field(..., min_length=1, max_length=255)
    """Users display name, for reference."""

    password: str = Field(..., min_length=8, max_length=255)
    """Users password, must meet strength requirements."""

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets strength requirements."""

        return _validate_password_strength(v)


class UserLoginRequest(BaseModel):
    """User login request."""

    email: EmailStr
    """Users email address, used for login and identification."""

    password: str
    """Users password."""


class UserResponse(BaseModel):
    """User response model."""

    id: int
    """Unique identifier for the user."""

    email: str
    """Users email address."""

    name: str
    """Users display name."""

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Token response model."""

    access_token: str
    """JWT access token string, used for authenticated requests."""

    token_type: str = "bearer"  # noqa
    """Type of the token, always 'bearer'."""

    user: UserResponse
    """User information included in the token response."""


class ProfileUpdateRequest(BaseModel):
    """User profile update request."""

    email: EmailStr | None = None
    """New email address for the user, must be unique if provided."""

    name: str | None = Field(None, min_length=1, max_length=255)
    """New display name for the user."""

    current_password: str | None = None
    """Current password of the user, required for password change."""

    new_password: str | None = Field(None, min_length=8, max_length=255)
    """New password for the user, must meet strength requirements."""

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str | None) -> str | None:
        """Validate password meets strength requirements."""

        if v is None:
            return v

        return _validate_password_strength(v)
