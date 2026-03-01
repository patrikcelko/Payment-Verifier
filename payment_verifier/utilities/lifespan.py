"""
Application lifespan management
===============================
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from payment_verifier.database import Base, engine
from payment_verifier.database.connection import async_session_factory
from payment_verifier.database.models.request_log import prune_request_logs

logger = logging.getLogger(__name__)

_LOG_PRUNE_INTERVAL_SECONDS = 1800  # every 30 minutes


async def _periodic_log_prune() -> None:
    """Background coroutine that prunes old request logs periodically."""

    while True:
        await asyncio.sleep(_LOG_PRUNE_INTERVAL_SECONDS)
        try:
            async with async_session_factory() as session:
                deleted = await prune_request_logs(session)
            if deleted:
                logger.info(f'Pruned {deleted} old request log(s)')
        except Exception:
            logger.exception('Error during log pruning')


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Create tables on startup, run periodic log cleanup."""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    prune_task = asyncio.create_task(_periodic_log_prune())

    yield

    prune_task.cancel()
