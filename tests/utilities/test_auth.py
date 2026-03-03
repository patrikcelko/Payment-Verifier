"""
Tests authentication
====================
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.user import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    user_exists,
)
from payment_verifier.utilities.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_creates_hash() -> None:
    """Test that hash_password returns a hash."""

    password = "SecurePassword123"  # noqa
    hashed = hash_password(password)

    assert hashed != password
    assert len(hashed) > 20
    assert hashed.startswith("$2b$")  # bcrypt format


def test_verify_password_correct() -> None:
    """Test that verify_password accepts correct password."""

    password = "SecurePassword123"  # noqa
    hashed = hash_password(password)

    assert verify_password(password, hashed) is True


def test_verify_password_incorrect() -> None:
    """Test that verify_password rejects incorrect password."""

    password = "SecurePassword123"  # noqa
    wrong_password = "WrongPassword123"  # noqa
    hashed = hash_password(password)

    assert verify_password(wrong_password, hashed) is False


def test_verify_password_different_hashes() -> None:
    """Test that same password produces different hashes."""

    password = "SecurePassword123"  # noqa
    hash1 = hash_password(password)
    hash2 = hash_password(password)

    assert hash1 != hash2
    assert verify_password(password, hash1) is True
    assert verify_password(password, hash2) is True


def test_create_access_token() -> None:
    """Test that create_access_token returns a valid token."""

    user_id = 1
    token = create_access_token(user_id)

    assert isinstance(token, str)
    assert len(token) > 20
    assert token.count(".") == 2  # JWT has 3 parts separated by dots


def test_decode_access_token_valid() -> None:
    """Test that decode_access_token returns correct user_id for valid token."""

    user_id = 42
    token = create_access_token(user_id)

    decoded_id = decode_access_token(token)
    assert decoded_id == user_id


def test_decode_access_token_invalid() -> None:
    """Test that decode_access_token returns None for invalid token."""

    invalid_token = "invalid.token.here"  # noqa

    decoded_id = decode_access_token(invalid_token)
    assert decoded_id is None


def test_decode_access_token_empty() -> None:
    """Test that decode_access_token returns None for empty token."""

    decoded_id = decode_access_token("")
    assert decoded_id is None


def test_decode_access_token_different_users() -> None:
    """Test that different tokens decode to different users."""

    token1 = create_access_token(1)
    token2 = create_access_token(2)

    assert decode_access_token(token1) == 1
    assert decode_access_token(token2) == 2


@pytest.mark.asyncio
async def test_create_user(session: AsyncSession) -> None:
    """Test that create_user inserts a user."""

    email = "test@example.com"
    password_hash = hash_password("password123")

    user = await create_user(session, email=email, name="Test User", password_hash=password_hash)

    assert user.id is not None
    assert user.email == email
    assert user.password_hash == password_hash
    assert user.is_active is True


@pytest.mark.asyncio
async def test_get_user_by_email_exists(session: AsyncSession) -> None:
    """Test that get_user_by_email returns user when exists."""

    email = "test@example.com"
    password_hash = hash_password("password123")
    created_user = await create_user(session, email=email, name="Test User", password_hash=password_hash)

    found_user = await get_user_by_email(session, email)

    assert found_user is not None
    assert found_user.id == created_user.id
    assert found_user.email == email


@pytest.mark.asyncio
async def test_get_user_by_email_not_exists(session: AsyncSession) -> None:
    """Test that get_user_by_email returns None when not exists."""

    found_user = await get_user_by_email(session, "nonexistent@example.com")
    assert found_user is None


@pytest.mark.asyncio
async def test_get_user_by_id_exists(session: AsyncSession) -> None:
    """Test that get_user_by_id returns user when exists."""

    email = "test@example.com"
    password_hash = hash_password("password123")
    created_user = await create_user(session, email=email, name="Test User", password_hash=password_hash)

    found_user = await get_user_by_id(session, created_user.id)

    assert found_user is not None
    assert found_user.id == created_user.id


@pytest.mark.asyncio
async def test_get_user_by_id_not_exists(session: AsyncSession) -> None:
    """Test that get_user_by_id returns None when not exists."""

    found_user = await get_user_by_id(session, 99999)
    assert found_user is None


@pytest.mark.asyncio
async def test_user_exists_true(session: AsyncSession) -> None:
    """Test that user_exists returns True when user exists."""

    email = "test@example.com"
    password_hash = hash_password("password123")
    await create_user(session, email=email, name="Test User", password_hash=password_hash)

    exists = await user_exists(session, email)
    assert exists is True


@pytest.mark.asyncio
async def test_user_exists_false(session: AsyncSession) -> None:
    """Test that user_exists returns False when user does not exist."""

    exists = await user_exists(session, "nonexistent@example.com")
    assert exists is False


def test_password_never_stored_in_plaintext() -> None:
    """Verify that passwords are never stored in plaintext."""

    password = "MySecretPassword123!"  # noqa
    hashed = hash_password(password)

    # Hash should not contain the original password
    assert password not in hashed
    assert password.lower() not in hashed.lower()


def test_bcrypt_hash_format() -> None:
    """Verify that hashes use proper bcrypt format."""

    password = "TestPassword123"  # noqa
    hashed = hash_password(password)

    assert hashed.startswith("$2b$") or hashed.startswith("$2a$") or hashed.startswith("$2y$")
    # Should have proper length (60 characters for bcrypt)
    assert len(hashed) == 60


def test_jwt_token_contains_no_sensitive_data() -> None:
    """Verify that JWT tokens don't contain sensitive information."""

    user_id = 999
    token = create_access_token(user_id)

    assert "password" not in token.lower()
    assert "@" not in token  # No email

    assert str(user_id) not in token.split(".")[0]  # Not in header
