"""
Health check endpoint
=====================
"""

from fastapi import APIRouter
from sqlalchemy import text

from payment_verifier.api.dependencies import DBSession

router = APIRouter()


@router.get("/api/health")
async def api_health(session: DBSession) -> dict[str, str | bool]:
    """Return health status including database connectivity."""

    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    status = "ok" if db_ok else "degraded"

    return {"status": status, "database": db_ok}
