"""
Tests status-messages
=====================
"""

from httpx import AsyncClient

from payment_verifier.database.models.status_message import DEFAULT_MESSAGES


async def test_list_returns_all_blocked_statuses(client: AsyncClient) -> None:
    """Test listing status messages returns all blocked statuses"""

    resp = await client.get('/api/status-messages')
    assert resp.status_code == 200
    statuses = {m['status'] for m in resp.json()['messages']}
    assert {'UNPAID', 'OVERDUE', 'PARTIAL', 'SUSPENDED'} <= statuses


async def test_update_message(client: AsyncClient) -> None:
    """Test updating global status message stores custom message"""

    resp = await client.put(
        '/api/status-messages/UNPAID',
        json={'message': 'Custom unpaid message'},
    )
    assert resp.status_code == 200
    assert resp.json()['message'] == 'Custom unpaid message'
    assert resp.json()['status'] == 'UNPAID'


async def test_update_non_configurable_status_returns_404(client: AsyncClient) -> None:
    """Test updating non-configurable status returns HTTP 404"""

    await client.put(
        '/api/status-messages/OK',
        json={'message': 'Should not work'},
    )
    assert resp.status_code == 404  # type: ignore # noqa


async def test_update_empty_message_returns_422(client: AsyncClient) -> None:
    """Test updating with empty message returns HTTP 422"""

    resp = await client.put('/api/status-messages/UNPAID', json={'message': ''})
    assert resp.status_code == 422


async def test_list_shows_stored_custom_messages(client: AsyncClient) -> None:
    """Test listing merges custom messages with default messages"""

    await client.put('/api/status-messages/UNPAID', json={'message': 'Custom!'})
    resp = await client.get('/api/status-messages')
    assert resp.status_code == 200
    msgs = {m['status']: m['message'] for m in resp.json()['messages']}
    assert msgs['UNPAID'] == 'Custom!'

    assert msgs['OVERDUE'] == DEFAULT_MESSAGES['OVERDUE']


async def test_reset_restores_defaults(client: AsyncClient) -> None:
    """Test resetting status messages restores all defaults"""

    await client.put('/api/status-messages/UNPAID', json={'message': 'Temporary'})
    resp = await client.post('/api/status-messages/reset')
    assert resp.status_code == 200
    msgs = {m['status']: m['message'] for m in resp.json()['messages']}
    assert msgs['UNPAID'] == DEFAULT_MESSAGES['UNPAID']
