"""
Tests messages
==============
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.project import create_project
from payment_verifier.database.models.user import User


async def test_list_returns_all_four_statuses(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test listing project messages returns all four blocking statuses"""

    proj = await create_project(session, user_id=user.id, name="ProjMsgs")
    resp = await client.get(f"/api/projects/{proj.id}/messages")
    assert resp.status_code == 200
    data = resp.json()
    assert data["project_id"] == proj.id
    assert len(data["messages"]) == 4
    assert all(m["is_custom"] is False for m in data["messages"])


async def test_set_project_message(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test setting custom message for project status"""

    proj = await create_project(session, user_id=user.id, name="SetProjMsg")
    resp = await client.put(
        f"/api/projects/{proj.id}/messages/UNPAID",
        json={"message": "Custom per-project"},
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Custom per-project"

    resp2 = await client.get(f"/api/projects/{proj.id}/messages")
    unpaid = next(m for m in resp2.json()["messages"] if m["status"] == "UNPAID")
    assert unpaid["is_custom"] is True
    assert unpaid["message"] == "Custom per-project"


async def test_delete_project_message(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test deleting project-specific message reverts to global message"""

    proj = await create_project(session, user_id=user.id, name="DelProjMsg")
    await client.put(
        f"/api/projects/{proj.id}/messages/OVERDUE",
        json={"message": "Custom"},
    )
    resp = await client.delete(f"/api/projects/{proj.id}/messages/OVERDUE")
    assert resp.status_code == 200

    resp2 = await client.get(f"/api/projects/{proj.id}/messages")
    overdue = next(m for m in resp2.json()["messages"] if m["status"] == "OVERDUE")
    assert overdue["is_custom"] is False


async def test_delete_nonexistent_message_returns_404(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test deleting non-existent project message returns HTTP 404"""

    proj = await create_project(session, user_id=user.id, name="DelNotFound2")
    resp = await client.delete(f"/api/projects/{proj.id}/messages/UNPAID")
    assert resp.status_code == 404


async def test_reset_project_messages(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test resetting project messages removes all custom messages"""

    proj = await create_project(session, user_id=user.id, name="ResetProjMsgs")
    await client.put(f"/api/projects/{proj.id}/messages/UNPAID", json={"message": "A"})
    await client.put(f"/api/projects/{proj.id}/messages/OVERDUE", json={"message": "B"})
    resp = await client.post(f"/api/projects/{proj.id}/messages/reset")
    assert resp.status_code == 200

    resp2 = await client.get(f"/api/projects/{proj.id}/messages")
    assert all(m["is_custom"] is False for m in resp2.json()["messages"])


async def test_messages_for_nonexistent_project_returns_404(client: AsyncClient) -> None:
    """Test getting messages for non-existent project returns HTTP 404"""

    resp = await client.get("/api/projects/99999/messages")
    assert resp.status_code == 404


async def test_set_message_nonexistent_project_returns_404(client: AsyncClient) -> None:
    """Test setting message for non-existent project returns HTTP 404"""

    resp = await client.put(
        "/api/projects/99999/messages/UNPAID",
        json={"message": "X"},
    )
    assert resp.status_code == 404


async def test_set_message_invalid_status_returns_404(
    client: AsyncClient,
    session: AsyncSession,
    user: User,
) -> None:
    """Test setting message for invalid status returns HTTP 404"""

    proj = await create_project(session, user_id=user.id, name="BadStatus")
    resp = await client.put(
        f"/api/projects/{proj.id}/messages/INVALID",
        json={"message": "X"},
    )
    assert resp.status_code == 404


async def test_delete_message_nonexistent_project_returns_404(client: AsyncClient) -> None:
    """Test deleting message for non-existent project returns HTTP 404"""

    resp = await client.delete("/api/projects/99999/messages/UNPAID")
    assert resp.status_code == 404


async def test_reset_messages_nonexistent_project_returns_404(client: AsyncClient) -> None:
    """Test resetting messages for non-existent project returns HTTP 404"""

    resp = await client.post("/api/projects/99999/messages/reset")
    assert resp.status_code == 404
