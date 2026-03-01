"""
Tests admin endpoint
====================
"""

from __future__ import annotations

from httpx import AsyncClient

from payment_verifier import __version__


async def test_admin_returns_html(client: AsyncClient) -> None:
    """Test admin dashboard returns HTML response"""

    resp = await client.get('/admin')
    assert resp.status_code == 200
    assert 'text/html' in resp.headers['content-type']
    assert 'Payment' in resp.text


async def test_admin_contains_version(client: AsyncClient) -> None:
    """Test admin dashboard includes application version"""

    resp = await client.get('/admin')
    assert __version__ in resp.text
