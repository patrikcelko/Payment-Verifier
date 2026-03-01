"""
Tests Request logs
==================
"""

from sqlalchemy.ext.asyncio import AsyncSession

from payment_verifier.database.models.request_log import (
    count_request_logs,
    create_request_log,
    get_log_stats,
    list_request_logs,
    prune_request_logs,
)


async def test_create_log(session: AsyncSession) -> None:
    """Test creating a request log entry"""

    log = await create_request_log(
        session,
        project_name="TestApp",
        status_code=200,
        response_text="OK",
        client_ip="127.0.0.1",
    )
    assert log.id is not None
    assert log.project_name == "TestApp"
    assert log.status_code == 200
    assert log.client_ip == "127.0.0.1"


async def test_list_logs_newest_first(session: AsyncSession) -> None:
    """Test listing logs returns them ordered by created_at DESC (newest first)"""

    await create_request_log(session, project_name="First", status_code=200, response_text="OK")
    await create_request_log(session, project_name="Second", status_code=200, response_text="OK")
    await create_request_log(session, project_name="Third", status_code=200, response_text="OK")
    logs = await list_request_logs(session)
    assert [log.project_name for log in logs] == ["Third", "Second", "First"]


async def test_count_logs(session: AsyncSession) -> None:
    """Test counting total log entries"""

    assert await count_request_logs(session) == 0
    await create_request_log(session, project_name="X", status_code=404, response_text="Not found")
    assert await count_request_logs(session) == 1


async def test_filter_by_status_code(session: AsyncSession) -> None:
    """Test filtering logs by HTTP status code"""

    await create_request_log(session, project_name="A", status_code=200, response_text="OK")
    await create_request_log(session, project_name="B", status_code=402, response_text="Payment Required")
    await create_request_log(session, project_name="C", status_code=200, response_text="OK")
    logs = await list_request_logs(session, limit=100, offset=0, status_code=200)
    assert len(logs) == 2
    assert all(e.status_code == 200 for e in logs)


async def test_filter_by_project_name(session: AsyncSession) -> None:
    """Test filtering logs by project name (case-insensitive partial match)"""

    await create_request_log(session, project_name="Alpha-App", status_code=200, response_text="OK")
    await create_request_log(session, project_name="Beta-App", status_code=402, response_text="Payment Required")
    logs = await list_request_logs(session, limit=100, offset=0, project_name="alpha")
    assert len(logs) == 1
    assert logs[0].project_name == "Alpha-App"


async def test_count_with_filters(session: AsyncSession) -> None:
    """Test counting logs with status code filter"""

    await create_request_log(session, project_name="X", status_code=200, response_text="OK")
    await create_request_log(session, project_name="Y", status_code=404, response_text="Not found")
    assert await count_request_logs(session, status_code=200) == 1
    assert await count_request_logs(session, status_code=404) == 1
    assert await count_request_logs(session) == 2


async def test_count_with_project_filter(session: AsyncSession) -> None:
    """Test counting logs with project name filter"""

    await create_request_log(session, project_name="Alpha-App", status_code=200, response_text="OK")
    await create_request_log(session, project_name="Beta-App", status_code=200, response_text="OK")
    assert await count_request_logs(session, project_name="alpha") == 1
    assert await count_request_logs(session, project_name="beta") == 1


async def test_stats(session: AsyncSession) -> None:
    """Test getting aggregated log statistics by status code"""

    await create_request_log(session, project_name="A", status_code=200, response_text="OK")
    await create_request_log(session, project_name="B", status_code=200, response_text="OK")
    await create_request_log(session, project_name="C", status_code=402, response_text="Payment Required")
    await create_request_log(session, project_name="D", status_code=404, response_text="Not found")
    stats = await get_log_stats(session)
    assert stats["total"] == 4
    assert stats["200"] == 2
    assert stats["402"] == 1
    assert stats["404"] == 1


async def test_stats_empty_db(session: AsyncSession) -> None:
    """Test stats on an empty database returns zero total"""

    stats = await get_log_stats(session)
    assert stats["total"] == 0


async def test_prune_does_nothing_below_limit(session: AsyncSession) -> None:
    """Test pruning when log count is below limit does nothing"""

    for i in range(5):
        await create_request_log(session, project_name=f"P{i}", status_code=200, response_text="OK")
    deleted = await prune_request_logs(session, keep=10)
    assert deleted == 0
    assert await count_request_logs(session) == 5


async def test_prune_removes_oldest(session: AsyncSession) -> None:
    """Test pruning removes oldest logs when exceeding limit"""

    for i in range(15):
        await create_request_log(session, project_name=f"Log-{i}", status_code=200, response_text="OK")

    deleted = await prune_request_logs(session, keep=10)
    assert deleted == 5
    assert await count_request_logs(session) == 10

    logs = await list_request_logs(session, limit=100)
    names = [log.project_name for log in logs]

    for i in range(5):
        assert f"Log-{i}" not in names

    for i in range(5, 15):
        assert f"Log-{i}" in names


async def test_prune_at_exact_limit(session: AsyncSession) -> None:
    """Test pruning when exactly at limit does not delete anything"""

    for i in range(10):
        await create_request_log(session, project_name=f"Exact-{i}", status_code=200, response_text="OK")

    deleted = await prune_request_logs(session, keep=10)
    assert deleted == 0
    assert await count_request_logs(session) == 10
