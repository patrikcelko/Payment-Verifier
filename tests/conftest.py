"""
Test fixtures
=============
"""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from payment_verifier.database.connection import get_session
from payment_verifier.database.models import Base

TEST_DATABASE_URL = 'sqlite+aiosqlite:///:memory:'

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

    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture()
async def session() -> AsyncGenerator[AsyncSession]:
    """Raw async session for direct DB operations in tests."""

    async with TestSessionFactory() as s:
        yield s
