"""
Tests verification endpoint
===========================
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.project import create_project
from payment_verifier.database.models.request_log import list_request_logs
from payment_verifier.database.models.status_message import upsert_status_message
from payment_verifier.database.models.user import User


async def test_ok_project_returns_200(client: AsyncClient, session: AsyncSession, user: User) -> None:
    """Test OK status project returns HTTP 200"""

    await create_project(session, user_id=user.id, name="Active-Project", status="OK")
    resp = await client.get("/", params={"project": "Active-Project"})
    assert resp.status_code == 200
    assert resp.text == "OK"


async def test_unpaid_project_returns_402(client: AsyncClient, session: AsyncSession, user: User) -> None:
    """Test UNPAID status project returns HTTP 402 with JSON body"""

    await create_project(session, user_id=user.id, name="Unpaid-Project", status="UNPAID")
    resp = await client.get("/", params={"project": "Unpaid-Project"})
    assert resp.status_code == 402
    data = resp.json()
    assert data["status"] == "UNPAID"
    assert len(data["message"]) > 0


async def test_unknown_project_returns_404(client: AsyncClient) -> None:
    """Test unknown project returns HTTP 404"""

    resp = await client.get("/", params={"project": "Nonexistent"})
    assert resp.status_code == 404
    assert resp.text == "Project not found"


async def test_missing_query_param_returns_dashboard(client: AsyncClient) -> None:
    """Test missing query parameter returns admin dashboard (HTTP 200)"""

    resp = await client.get("/")
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert "Payment Verifier" in resp.text or "admin" in resp.text.lower()


async def test_overdue_returns_402(client: AsyncClient, session: AsyncSession, user: User) -> None:
    """Test OVERDUE status returns HTTP 402"""

    await create_project(session, user_id=user.id, name="Overdue-App", status="OVERDUE")
    resp = await client.get("/", params={"project": "Overdue-App"})
    assert resp.status_code == 402


async def test_partial_returns_402(client: AsyncClient, session: AsyncSession, user: User) -> None:
    """Test PARTIAL status returns HTTP 402"""

    await create_project(session, user_id=user.id, name="Partial-App", status="PARTIAL")
    resp = await client.get("/", params={"project": "Partial-App"})
    assert resp.status_code == 402


async def test_suspended_returns_402(client: AsyncClient, session: AsyncSession, user: User) -> None:
    """Test SUSPENDED status returns HTTP 402"""

    await create_project(session, user_id=user.id, name="Suspended-App", status="SUSPENDED")
    resp = await client.get("/", params={"project": "Suspended-App"})
    assert resp.status_code == 402


async def test_pending_returns_200(client: AsyncClient, session: AsyncSession, user: User) -> None:
    """Test PENDING status is non-blocking and returns HTTP 200"""

    await create_project(session, user_id=user.id, name="Pending-App", status="PENDING")
    resp = await client.get("/", params={"project": "Pending-App"})
    assert resp.status_code == 200


async def test_402_contains_json_body(client: AsyncClient, session: AsyncSession, user: User) -> None:
    """Test 402 response contains JSON body with status and message"""

    await create_project(session, user_id=user.id, name="JSON-Test", status="UNPAID")
    resp = await client.get("/", params={"project": "JSON-Test"})
    assert resp.status_code == 402
    data = resp.json()
    assert "status" in data
    assert "message" in data


async def test_402_uses_custom_global_message(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test 402 response uses custom global status message"""

    await create_project(session, user_id=user.id, name="Custom-Msg", status="OVERDUE")
    await upsert_status_message(session, status="OVERDUE", message="Pay now!")
    resp = await client.get("/", params={"project": "Custom-Msg"})
    assert resp.status_code == 402
    assert resp.json()["message"] == "Pay now!"


async def test_402_uses_project_specific_message(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test 402 response uses project-specific custom message over global message"""

    proj = await create_project(session, user_id=user.id, name="ProjMsg", status="UNPAID")
    await upsert_status_message(
        session,
        status="UNPAID",
        message="Per-project msg",
        project_id=proj.id,
    )
    resp = await client.get("/", params={"project": "ProjMsg"})
    assert resp.status_code == 402
    assert resp.json()["message"] == "Per-project msg"


async def test_ok_verification_creates_log(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test successful verification creates request log entry"""

    await create_project(session, user_id=user.id, name="LogTest", status="OK")
    await client.get("/", params={"project": "LogTest"})
    logs = await list_request_logs(session)
    assert any(e.project_name == "LogTest" and e.status_code == 200 for e in logs)


async def test_unpaid_verification_creates_log(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test unpaid verification creates request log entry with 402 status"""

    await create_project(session, user_id=user.id, name="UnpaidLog", status="UNPAID")
    await client.get("/", params={"project": "UnpaidLog"})
    logs = await list_request_logs(session)
    assert any(e.project_name == "UnpaidLog" and e.status_code == 402 for e in logs)


async def test_not_found_verification_creates_log(
    client: AsyncClient,
    session: AsyncSession,
) -> None:
    """Test not found verification creates request log entry with 404 status"""

    await client.get("/", params={"project": "Ghost"})
    logs = await list_request_logs(session)
    assert any(e.project_name == "Ghost" and e.status_code == 404 for e in logs)


async def test_x_forwarded_for_is_stored(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test X-Forwarded-For header is stored as client IP in request log"""

    await create_project(session, user_id=user.id, name="IPTest", status="OK")
    await client.get(
        "/",
        params={"project": "IPTest"},
        headers={"x-forwarded-for": "203.0.113.5, 10.0.0.1"},
    )
    logs = await list_request_logs(session)
    assert logs[0].client_ip == "203.0.113.5"
