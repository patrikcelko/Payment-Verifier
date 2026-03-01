"""
Verification endpoint
=====================
"""

import json

from fastapi import APIRouter, Query, Request, Response

from payment_verifier.api.dependencies import DBSession
from payment_verifier.database.models.project import (
    BLOCKED_STATUSES,
    get_project_by_name,
    touch_last_queried,
)
from payment_verifier.database.models.request_log import create_request_log
from payment_verifier.database.models.status_message import get_message_for_status

router = APIRouter()


def _client_ip(request: Request) -> str:
    """Extract the client IP address, respecting `X-Forwarded-For`."""

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


@router.get("/", summary="Verify payment status", tags=["verification"])
async def check(
    request: Request,
    project: str = Query(..., description="Project name to verify"),
    *,
    session: DBSession,
) -> Response:
    """Return payment status for the given project.

    - 200 OK - payment is verified.
    - 402 Payment Required - payment is missing / unpaid (JSON body with message).
    - 404 Not Found - project does not exist in the registry.
    """

    row = await get_project_by_name(session, project)

    if row is None:
        text = "Project not found"
        await create_request_log(
            session,
            project_name=project,
            status_code=404,
            response_text=text,
            client_ip=_client_ip(request),
        )
        return Response(content=text, status_code=404)

    if row.status in BLOCKED_STATUSES:
        message = await get_message_for_status(session, row.status, project_id=row.id)
        text = message or "Payment Required"
        await touch_last_queried(session, row)
        await create_request_log(
            session,
            project_name=project,
            status_code=402,
            response_text=text,
            client_ip=_client_ip(request),
        )
        body = json.dumps({"status": row.status, "message": message})
        return Response(
            content=body,
            status_code=402,
            media_type="application/json",
        )

    text = "OK"
    await touch_last_queried(session, row)
    await create_request_log(
        session,
        project_name=project,
        status_code=200,
        response_text=text,
        client_ip=_client_ip(request),
    )
    return Response(content=text, status_code=200)
