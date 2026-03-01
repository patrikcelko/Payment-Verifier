"""
Status Message model
====================
"""

from sqlalchemy import ForeignKey, Integer, String, Text, and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from payment_verifier.database.models.base import Base

# Default messages returned in the 402 JSON body for each blocked status.
DEFAULT_MESSAGES: dict[str, str] = {
    "UNPAID": "Payment is required. Service access is restricted until payment is received.",
    "OVERDUE": "Payment is overdue. Service has been suspended due to non-payment.",
    "PARTIAL": "Partial payment received. Full payment is required to restore service access.",
    "SUSPENDED": "Service has been suspended. Please contact the administrator.",
}


class StatusMessage(Base):
    """Custom message associated with a payment status (global or per-project)."""

    __tablename__ = "status_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    """Primary key for the status message."""

    project_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
        default=None,
        index=True,
    )
    """Foreign key to the project this message applies to, or NULL for global."""

    status: Mapped[str] = mapped_column(String(50), nullable=False)
    """The payment status this message corresponds to."""

    message: Mapped[str] = mapped_column(Text, nullable=False)
    """The custom message for the given status."""

    def __repr__(self) -> str:
        return f"<StatusMessage(id={self.id}, project_id={self.project_id}, status={self.status!r})>"


async def list_status_messages(session: AsyncSession) -> list[StatusMessage]:
    """Return all *global* status messages ordered by status name."""

    stmt = select(StatusMessage).where(StatusMessage.project_id.is_(None)).order_by(StatusMessage.status)
    result = await session.execute(stmt)

    return list(result.scalars().all())


async def get_status_message(
    session: AsyncSession,
    status: str,
    *,
    project_id: int | None = None,
) -> StatusMessage | None:
    """Return a status message row, or ``None``."""

    if project_id is None:
        stmt = select(StatusMessage).where(
            and_(StatusMessage.project_id.is_(None), StatusMessage.status == status),
        )
    else:
        stmt = select(StatusMessage).where(
            and_(StatusMessage.project_id == project_id, StatusMessage.status == status),
        )
    result = await session.execute(stmt)

    return result.scalar_one_or_none()


async def upsert_status_message(
    session: AsyncSession,
    *,
    status: str,
    message: str,
    project_id: int | None = None,
) -> StatusMessage:
    """Create or update a message for the given status (global or per-project)."""

    existing = await get_status_message(session, status, project_id=project_id)
    if existing is None:
        row = StatusMessage(project_id=project_id, status=status, message=message)
        session.add(row)
    else:
        existing.message = message
        row = existing

    await session.commit()
    await session.refresh(row)

    return row


async def reset_status_messages(session: AsyncSession) -> list[StatusMessage]:
    """Reset global status messages to their defaults."""

    rows: list[StatusMessage] = []
    for status, message in sorted(DEFAULT_MESSAGES.items()):
        existing = await get_status_message(session, status, project_id=None)
        if existing is None:
            row = StatusMessage(project_id=None, status=status, message=message)
            session.add(row)
            rows.append(row)
        else:
            existing.message = message
            rows.append(existing)
    await session.commit()

    for row in rows:
        await session.refresh(row)

    return rows


async def get_message_for_status(
    session: AsyncSession,
    status: str,
    *,
    project_id: int | None = None,
) -> str:
    """Resolve the message for *status* with cascading fallback."""

    if project_id is not None:
        row = await get_status_message(session, status, project_id=project_id)
        if row is not None:
            return row.message

    row = await get_status_message(session, status, project_id=None)
    if row is not None:
        return row.message

    return DEFAULT_MESSAGES.get(status, "Payment Required")


async def list_project_messages(
    session: AsyncSession,
    project_id: int,
) -> list[StatusMessage]:
    """Return all status messages for a specific project."""

    stmt = select(StatusMessage).where(StatusMessage.project_id == project_id).order_by(StatusMessage.status)
    result = await session.execute(stmt)

    return list(result.scalars().all())


async def delete_project_message(
    session: AsyncSession,
    *,
    project_id: int,
    status: str,
) -> bool:
    """Delete a project-specific message (falls back to global). Returns True if deleted."""

    row = await get_status_message(session, status, project_id=project_id)
    if row is None:
        return False

    await session.delete(row)
    await session.commit()

    return True


async def reset_project_messages(session: AsyncSession, project_id: int) -> None:
    """Remove all project-specific messages (they fall back to global)."""

    stmt = delete(StatusMessage).where(StatusMessage.project_id == project_id)
    await session.execute(stmt)
    await session.commit()
