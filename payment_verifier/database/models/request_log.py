"""
Request log model
=================
"""

import datetime
from typing import Any, cast

from sqlalchemy import DateTime, Integer, Select, String, delete, func, select
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from payment_verifier.database.models.base import Base


class RequestLog(Base):
    """Audit log for every verification request."""

    __tablename__ = "request_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    """Primary key for the log entry."""

    project_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    """The project name that was verified in the request."""

    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    """HTTP status code returned for the request."""

    response_text: Mapped[str] = mapped_column(String(255), nullable=False)
    """Textual response returned for the request."""

    client_ip: Mapped[str] = mapped_column(String(45), nullable=False, default="unknown")
    """IP address of the client making the request."""

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    """Timestamp when the request was logged."""

    def __repr__(self) -> str:
        return (
            f"<RequestLog(id={self.id}, project={self.project_name!r}, "
            f"status={self.status_code}, ip={self.client_ip!r})>"
        )


def _apply_log_filters(
    stmt: Select[Any],
    *,
    status_code: int | None = None,
    project_name: str | None = None,
) -> Select[Any]:
    """Append common WHERE clauses for log queries."""

    if status_code is not None:
        return stmt.where(RequestLog.status_code == status_code)

    if project_name:
        return stmt.where(RequestLog.project_name.ilike(f"%{project_name}%"))

    return stmt


async def create_request_log(
    session: AsyncSession,
    *,
    project_name: str,
    status_code: int,
    response_text: str,
    client_ip: str = "unknown",
) -> RequestLog:
    """Record a verification request in the audit log."""

    log = RequestLog(
        project_name=project_name,
        status_code=status_code,
        response_text=response_text,
        client_ip=client_ip,
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)

    return log


async def list_request_logs(
    session: AsyncSession,
    *,
    limit: int = 100,
    offset: int = 0,
    status_code: int | None = None,
    project_name: str | None = None,
) -> list[RequestLog]:
    """Return recent request logs, newest first, with optional filters."""

    stmt = _apply_log_filters(select(RequestLog), status_code=status_code, project_name=project_name)
    stmt = stmt.order_by(RequestLog.created_at.desc(), RequestLog.id.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)

    return list(result.scalars().all())


async def count_request_logs(
    session: AsyncSession,
    *,
    status_code: int | None = None,
    project_name: str | None = None,
) -> int:
    """Return total number of request log entries (with optional filters)."""

    stmt = _apply_log_filters(select(func.count(RequestLog.id)), status_code=status_code, project_name=project_name)
    result = await session.execute(stmt)

    return result.scalar_one()


async def get_log_stats(session: AsyncSession) -> dict[str, int]:
    """Return request count grouped by status code."""

    stmt = select(RequestLog.status_code, func.count(RequestLog.id)).group_by(RequestLog.status_code)

    result = await session.execute(stmt)
    stats: dict[str, int] = {}
    total = 0
    for code, cnt in result.all():
        stats[str(code)] = cnt
        total += cnt
    stats["total"] = total

    return stats


MAX_LOG_ENTRIES: int = 100_000
"""Maximum number of request log rows to keep."""


async def prune_request_logs(session: AsyncSession, *, keep: int = MAX_LOG_ENTRIES) -> int:
    """Delete the oldest logs exceeding *keep* rows."""

    total = await count_request_logs(session)
    if total <= keep:
        return 0

    cutoff_stmt = select(RequestLog.id).order_by(RequestLog.id.desc()).limit(1).offset(keep - 1)
    cutoff_result = await session.execute(cutoff_stmt)
    cutoff_id: int | None = cutoff_result.scalar_one_or_none()
    if cutoff_id is None:
        return 0

    del_stmt = delete(RequestLog).where(RequestLog.id < cutoff_id)
    cursor = cast("CursorResult[Any]", await session.execute(del_stmt))
    await session.commit()

    return cursor.rowcount
