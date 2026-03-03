"""
Log endpoints
=============
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from payment_verifier.api.dependencies import DBSession, get_current_user
from payment_verifier.api.schemas.log import (
    LogStatsResponse,
    RequestLogListResponse,
    RequestLogResponse,
)
from payment_verifier.database.models.request_log import (
    count_request_logs,
    get_log_stats,
    list_request_logs,
)
from payment_verifier.database.models.user import User

router = APIRouter()


@router.get(
    "/api/logs",
    response_model=RequestLogListResponse,
    summary="List verification request logs",
    tags=["logs"],
)
async def api_list_logs(
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=100, ge=1, le=1000, description="Max entries to return"),
    offset: int = Query(default=0, ge=0, description="Number of entries to skip"),
    status_code: int | None = Query(default=None, description="Filter by HTTP status code"),
    project_name: str | None = Query(default=None, description="Filter by project name (partial match)"),
) -> RequestLogListResponse:
    """Return recent verification request logs for current users projects (newest first).

    Includes logs from:
    - All projects owned by the authenticated user
    - 404 errors (attempts to verify unknown projects)
    """

    total = await count_request_logs(session, user_id=user.id, status_code=status_code, project_name=project_name)
    rows = await list_request_logs(
        session,
        limit=limit,
        offset=offset,
        user_id=user.id,
        status_code=status_code,
        project_name=project_name,
    )

    return RequestLogListResponse(
        count=len(rows),
        total=total,
        logs=[RequestLogResponse.model_validate(r) for r in rows],
    )


@router.get(
    "/api/logs/stats",
    response_model=LogStatsResponse,
    summary="Request log statistics",
    tags=["logs"],
)
async def api_log_stats(
    session: DBSession,
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, int]:
    """Return aggregated log counts grouped by status code for current user's projects."""

    return await get_log_stats(session, user_id=user.id)
