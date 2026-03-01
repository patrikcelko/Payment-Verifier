"""
Tests Status message
====================
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.project import create_project
from payment_verifier.database.models.status_message import (
    DEFAULT_MESSAGES,
    delete_project_message,
    get_message_for_status,
    get_status_message,
    list_project_messages,
    list_status_messages,
    reset_project_messages,
    reset_status_messages,
    upsert_status_message,
)


async def test_upsert_creates_new(session: AsyncSession) -> None:
    """Test upserting creates a new global status message"""

    row = await upsert_status_message(session, status='UNPAID', message='Custom msg')
    assert row.status == 'UNPAID'
    assert row.message == 'Custom msg'
    assert row.project_id is None


async def test_upsert_updates_existing(session: AsyncSession) -> None:
    """Test upserting an existing status updates the message"""

    await upsert_status_message(session, status='OVERDUE', message='First')
    updated = await upsert_status_message(session, status='OVERDUE', message='Second')
    assert updated.message == 'Second'


async def test_get_status_message(session: AsyncSession) -> None:
    """Test retrieving a global status message by status"""

    await upsert_status_message(session, status='PARTIAL', message='Partial msg')
    row = await get_status_message(session, 'PARTIAL')
    assert row is not None
    assert row.message == 'Partial msg'


async def test_get_status_message_not_found(session: AsyncSession) -> None:
    """Test getting a non-existent status message returns None"""

    assert await get_status_message(session, 'NONEXIST') is None


async def test_list_status_messages_sorted(session: AsyncSession) -> None:
    """Test listing status messages returns them sorted by status"""

    await upsert_status_message(session, status='UNPAID', message='U')
    await upsert_status_message(session, status='OVERDUE', message='O')
    rows = await list_status_messages(session)
    assert len(rows) == 2
    assert rows[0].status == 'OVERDUE'
    assert rows[1].status == 'UNPAID'


async def test_reset_restores_defaults(session: AsyncSession) -> None:
    """Test resetting messages restores all default messages"""

    await upsert_status_message(session, status='UNPAID', message='Custom')
    rows = await reset_status_messages(session)
    statuses = {r.status for r in rows}
    assert statuses == set(DEFAULT_MESSAGES.keys())
    unpaid = next(r for r in rows if r.status == 'UNPAID')
    assert unpaid.message == DEFAULT_MESSAGES['UNPAID']


async def test_message_falls_back_to_default(session: AsyncSession) -> None:
    """Test message retrieval falls back to default when no custom exists"""

    msg = await get_message_for_status(session, 'UNPAID')
    assert msg == DEFAULT_MESSAGES['UNPAID']


async def test_message_uses_custom_global(session: AsyncSession) -> None:
    """Test message retrieval uses custom global message when available"""

    await upsert_status_message(session, status='SUSPENDED', message='Custom suspended')
    msg = await get_message_for_status(session, 'SUSPENDED')
    assert msg == 'Custom suspended'


async def test_message_unknown_status_fallback(session: AsyncSession) -> None:
    """Test unknown status fallback message"""

    msg = await get_message_for_status(session, 'NONEXIST')
    assert msg == 'Payment Required'


async def test_message_cascade_project_over_global(session: AsyncSession) -> None:
    """Test message cascade: project-specific > global > default"""

    project = await create_project(session, name='Cascade')

    # No messages -> default
    msg = await get_message_for_status(session, 'UNPAID', project_id=project.id)
    assert msg == DEFAULT_MESSAGES['UNPAID']

    # Global custom -> used
    await upsert_status_message(session, status='UNPAID', message='Global custom')
    msg = await get_message_for_status(session, 'UNPAID', project_id=project.id)
    assert msg == 'Global custom'

    # Project-specific -> overrides global
    await upsert_status_message(
        session, status='UNPAID', message='Project custom', project_id=project.id,
    )
    msg = await get_message_for_status(session, 'UNPAID', project_id=project.id)
    assert msg == 'Project custom'


async def test_upsert_project_message(session: AsyncSession) -> None:
    """Test creating a project-specific status message"""

    project = await create_project(session, name='MsgProject')
    row = await upsert_status_message(
        session, status='UNPAID', message='Project-specific', project_id=project.id,
    )
    assert row.project_id == project.id
    assert row.message == 'Project-specific'


async def test_list_project_messages_excludes_global(session: AsyncSession) -> None:
    """Test listing project messages excludes global messages"""

    project = await create_project(session, name='ListMsgs')
    await upsert_status_message(session, status='UNPAID', message='Global')
    await upsert_status_message(session, status='UNPAID', message='Proj', project_id=project.id)
    rows = await list_project_messages(session, project.id)
    assert len(rows) == 1
    assert rows[0].message == 'Proj'


async def test_delete_project_message(session: AsyncSession) -> None:
    """Test deleting a project-specific message"""

    project = await create_project(session, name='DelMsg')
    await upsert_status_message(
        session, status='OVERDUE', message='Custom', project_id=project.id,
    )
    deleted = await delete_project_message(session, project_id=project.id, status='OVERDUE')
    assert deleted is True

    msg = await get_message_for_status(session, 'OVERDUE', project_id=project.id)
    assert msg == DEFAULT_MESSAGES['OVERDUE']


async def test_delete_project_message_not_found(session: AsyncSession) -> None:
    """Test deleting a non-existent project message returns False"""

    project = await create_project(session, name='DelNotFound')
    assert await delete_project_message(session, project_id=project.id, status='UNPAID') is False


async def test_reset_project_messages(session: AsyncSession) -> None:
    """Test resetting all project-specific messages"""

    project = await create_project(session, name='ResetProj')
    await upsert_status_message(session, status='UNPAID', message='A', project_id=project.id)
    await upsert_status_message(session, status='OVERDUE', message='B', project_id=project.id)
    await reset_project_messages(session, project.id)
    assert await list_project_messages(session, project.id) == []
