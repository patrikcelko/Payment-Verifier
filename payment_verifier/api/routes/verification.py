"""
Verification endpoint
=====================
"""

import json
from pathlib import Path

from fastapi import APIRouter, Query, Request, Response
from fastapi.templating import Jinja2Templates

from payment_verifier import __version__
from payment_verifier.api.dependencies import DBSession
from payment_verifier.database.models.project import (
    BLOCKED_STATUSES,
    get_project_by_api_token,
    get_project_by_name,
    touch_last_queried,
)
from payment_verifier.database.models.request_log import create_request_log
from payment_verifier.database.models.status_message import get_message_for_status
from payment_verifier.utilities.ip_utils import extract_client_ip

router = APIRouter()

_BASE_DIR = Path(__file__).parent.parent.parent
templates = Jinja2Templates(directory=str(_BASE_DIR / "templates"))


def _client_ip(request: Request) -> str:
    """Extract the client IP address, respecting `X-Forwarded-For`.

    Validates IP addresses before accepting them.
    """

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = extract_client_ip(forwarded)
        if ip:
            return ip

    # Fall back to direct connection IP
    if request.client:
        return request.client.host

    return "unknown"


@router.get("/", summary="Verify payment status", tags=["verification"])
async def check(
    request: Request,
    project: str | None = Query(None, description="Project name to verify"),
    token: str | None = Query(None, description="Project API token to verify"),
    *,
    session: DBSession,
) -> Response:
    """Return payment status for the given project.

    - No parameters: Returns admin dashboard.
    - 200 OK - payment is verified.
    - 402 Payment Required - payment is missing / unpaid (JSON body with message).
    - 404 Not Found - project does not exist in the registry.
    """

    # If no project or token is specified, serve the admin dashboard
    if project is None and token is None:
        return templates.TemplateResponse(request, "admin.html", {"version": __version__})

    # Use token if provided, otherwise use project name
    if token is not None:
        row = await get_project_by_api_token(session, token)
        lookup_identifier = token
    else:
        if project is None:
            text = "Project name or API token is required"
            await create_request_log(
                session,
                project_name="unknown!",
                status_code=400,
                response_text=text,
                client_ip=_client_ip(request),
            )
            return Response(content=text, status_code=400)

        row = await get_project_by_name(session, project)
        lookup_identifier = project

    if row is None:
        text = "Project not found"
        await create_request_log(
            session,
            project_name=lookup_identifier or "unknown!",
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
            project_name=row.name,
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
        project_name=row.name,
        status_code=200,
        response_text=text,
        client_ip=_client_ip(request),
    )
    return Response(content=text, status_code=200)
