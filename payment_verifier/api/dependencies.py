"""
FastAPI dependencies
====================
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.connection import get_session

__all__ = ["DBSession"]

DBSession = Annotated[AsyncSession, Depends(get_session)]
"""Injecting an async database session via FastAPI DI."""
