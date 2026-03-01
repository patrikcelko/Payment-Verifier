"""
Tests logs endpoints
====================
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.project import create_project


async def test_logs_empty(client: AsyncClient) -> None:
    """Test listing logs returns empty array when no logs exist"""

    resp = await client.get('/api/logs')
    assert resp.status_code == 200
    data = resp.json()
    assert data['count'] == 0
    assert data['total'] == 0
    assert data['logs'] == []


async def test_logs_returns_entries(client: AsyncClient, session: AsyncSession) -> None:
    """Test logs endpoint returns request log entries"""

    await create_project(session, name='LogApiTest', status='OK')
    await client.get('/', params={'project': 'LogApiTest'})
    resp = await client.get('/api/logs')
    data = resp.json()
    assert data['total'] >= 1
    assert data['logs'][0]['project_name'] == 'LogApiTest'


async def test_logs_pagination(client: AsyncClient, session: AsyncSession) -> None:
    """Test logs pagination with limit and offset parameters"""

    await create_project(session, name='PagTest', status='OK')
    for _ in range(5):
        await client.get('/', params={'project': 'PagTest'})
    resp = await client.get('/api/logs', params={'limit': 2, 'offset': 0})
    data = resp.json()
    assert data['count'] == 2
    assert data['total'] == 5


async def test_filter_by_status_code(client: AsyncClient, session: AsyncSession) -> None:
    """Test filtering logs by HTTP status code"""

    await create_project(session, name='FilterTest', status='OK')
    await client.get('/', params={'project': 'FilterTest'})
    await client.get('/', params={'project': 'NoSuchProject'})
    resp = await client.get('/api/logs', params={'status_code': 200})
    data = resp.json()
    assert all(entry['status_code'] == 200 for entry in data['logs'])


async def test_filter_by_project_name(client: AsyncClient, session: AsyncSession) -> None:
    """Test filtering logs by project name"""

    await create_project(session, name='SearchMe', status='OK')
    await client.get('/', params={'project': 'SearchMe'})
    await client.get('/', params={'project': 'Other'})
    resp = await client.get('/api/logs', params={'project_name': 'SearchMe'})
    data = resp.json()
    assert all('SearchMe' in entry['project_name'] for entry in data['logs'])


async def test_combined_filters(client: AsyncClient, session: AsyncSession) -> None:
    """Test combining multiple filter parameters"""

    await create_project(session, name='Combo-OK', status='OK')
    await create_project(session, name='Combo-Unpaid', status='UNPAID')
    await client.get('/', params={'project': 'Combo-OK'})
    await client.get('/', params={'project': 'Combo-Unpaid'})
    await client.get('/', params={'project': 'Ghost'})

    resp = await client.get('/api/logs', params={'status_code': 200, 'project_name': 'Combo'})
    data = resp.json()
    assert data['total'] == 1
    assert data['logs'][0]['project_name'] == 'Combo-OK'


async def test_stats_endpoint(client: AsyncClient, session: AsyncSession) -> None:
    """Test stats endpoint returns aggregated status code counts"""

    await create_project(session, name='StatsTest', status='OK')
    await client.get('/', params={'project': 'StatsTest'})
    await client.get('/', params={'project': 'Ghost'})
    resp = await client.get('/api/logs/stats')
    assert resp.status_code == 200
    data = resp.json()
    assert data['total'] >= 2
    assert data.get('200', 0) >= 1
    assert data.get('404', 0) >= 1
