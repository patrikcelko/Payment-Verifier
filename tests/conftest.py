"""
Test fixtures
=============
"""

import os
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Set SECRET_KEY for tests before importing payment_verifier modules
if "SECRET_KEY" not in os.environ:
    os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-do-not-use-in-production"  # noqa

from payment_verifier.database.connection import get_session
from payment_verifier.database.models import Base
from payment_verifier.database.models.user import User, create_user

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionFactory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(autouse=True)
async def _setup_db() -> AsyncGenerator[None]:
    """Create all tables before each test and drop them after."""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_session() -> AsyncGenerator[AsyncSession]:
    """Override get_session dependency to use test database session."""

    async with TestSessionFactory() as session:
        yield session


@pytest.fixture()
async def client() -> AsyncGenerator[AsyncClient]:
    """Async HTTP client wired to the FastAPI app with test DB."""

    from payment_verifier import app

    app.dependency_overrides[get_session] = _override_get_session
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture()
async def session() -> AsyncGenerator[AsyncSession]:
    """Raw async session for direct DB operations in tests."""

    async with TestSessionFactory() as s:
        yield s


@pytest.fixture()
async def user(session: AsyncSession) -> User:
    """Create a test user in the database."""

    test_hash = "$2b$12$NQY50zgbyQwDEK33aumVDu7EL9YU9xT6omVMmeHJJ8V7O4lRVKqDy"

    return await create_user(
        session,
        email='test@example.com',
        name='Test User',
        password_hash=test_hash,
    )
