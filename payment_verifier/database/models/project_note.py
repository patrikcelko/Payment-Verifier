"""
Project note model
==================
"""

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from payment_verifier.database.models.base import Base


class ProjectNote(Base):
    """A single note/comment attached to a project."""

    __tablename__ = "project_notes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    """Primary key for the note."""

    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    """Foreign key to the project this note belongs to."""

    content: Mapped[str] = mapped_column(Text, nullable=False)
    """The note content, as free-form text."""

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    """Timestamp when the note was created."""

    def __repr__(self) -> str:
        return f"<ProjectNote(id={self.id}, project_id={self.project_id})>"


async def list_notes(session: AsyncSession, project_id: int) -> list[ProjectNote]:
    """Return all notes for a project, newest first."""

    stmt = select(ProjectNote).where(ProjectNote.project_id == project_id).order_by(ProjectNote.created_at.desc())
    result = await session.execute(stmt)

    return list(result.scalars().all())


async def create_note(session: AsyncSession, *, project_id: int, content: str) -> ProjectNote:
    """Add a new note to a project."""

    note = ProjectNote(project_id=project_id, content=content)
    session.add(note)

    await session.commit()
    await session.refresh(note)

    return note


async def delete_note(session: AsyncSession, note: ProjectNote) -> None:
    """Delete a note."""

    await session.delete(note)
    await session.commit()


async def get_note_by_id(session: AsyncSession, note_id: int) -> ProjectNote | None:
    """Return a note by primary key, or ``None``."""

    return await session.get(ProjectNote, note_id)
