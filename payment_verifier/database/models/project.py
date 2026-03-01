"""
Project model
=============
"""

from __future__ import annotations

import datetime

from sqlalchemy import DateTime, String, Text, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from payment_verifier.database.models.base import Base

# Valid project statuses
VALID_STATUSES = frozenset(
    {'OK', 'UNPAID', 'PENDING', 'OVERDUE', 'PARTIAL', 'SUSPENDED'}
)

# Statuses that block payment verification (return 402)
BLOCKED_STATUSES = frozenset({'UNPAID', 'OVERDUE', 'PARTIAL', 'SUSPENDED'})


class Project(Base):
    """Registered project with its payment status."""

    __tablename__ = 'projects'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    """Primary key for the project."""

    name: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    """The name of the project, unique and required."""

    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default='OK'
    )
    """The current status of the project."""

    customer_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    """The name of the customer associated with the project."""

    customer_address: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None
    )
    """The address of the customer associated with the project."""

    project_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True, default=None
    )
    """The URL of the project."""

    contact_person: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    """The contact person for the project."""

    contact_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    """The contact email for the project."""

    contact_phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default=None
    )
    """The contact phone number for the project."""

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    """Timestamp when the project was created."""

    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    """Timestamp when the project was last updated."""

    last_queried_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    """Timestamp when the project was last queried."""

    def __repr__(self) -> str:
        return f'<Project(id={self.id}, name={self.name!r}, status={self.status!r})>'


async def get_project_by_name(session: AsyncSession, name: str) -> Project | None:
    """Return a project by its unique name, or ``None``."""

    stmt = select(Project).where(Project.name == name)
    result = await session.execute(stmt)

    return result.scalar_one_or_none()


async def get_project_by_id(session: AsyncSession, project_id: int) -> Project | None:
    """Return a project by primary key, or ``None``."""

    return await session.get(Project, project_id)


async def list_projects(session: AsyncSession) -> list[Project]:
    """Return all projects ordered by name."""

    stmt = select(Project).order_by(Project.name)
    result = await session.execute(stmt)

    return list(result.scalars().all())


async def create_project(
    session: AsyncSession,
    *,
    name: str,
    status: str = 'OK',
    customer_name: str | None = None,
    customer_address: str | None = None,
    project_url: str | None = None,
    contact_person: str | None = None,
    contact_email: str | None = None,
    contact_phone: str | None = None,
) -> Project:
    """Insert a new project and return it."""

    project = Project(
        name=name,
        status=status,
        customer_name=customer_name,
        customer_address=customer_address,
        project_url=project_url,
        contact_person=contact_person,
        contact_email=contact_email,
        contact_phone=contact_phone,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    return project


_DETAIL_FIELDS = frozenset({
    'customer_name', 'customer_address', 'project_url',
    'contact_person', 'contact_email', 'contact_phone',
})


async def update_project(
    session: AsyncSession,
    project: Project,
    *,
    fields_set: frozenset[str],
    customer_name: str | None = None,
    customer_address: str | None = None,
    project_url: str | None = None,
    contact_person: str | None = None,
    contact_email: str | None = None,
    contact_phone: str | None = None,
) -> Project:
    """Update project detail fields (customer info, contact, URL)."""

    values = {
        'customer_name': customer_name,
        'customer_address': customer_address,
        'project_url': project_url,
        'contact_person': contact_person,
        'contact_email': contact_email,
        'contact_phone': contact_phone,
    }
    for field in _DETAIL_FIELDS & fields_set:
        setattr(project, field, values[field])

    await session.commit()
    await session.refresh(project)

    return project


async def update_project_status(session: AsyncSession, project: Project, status: str) -> Project:
    """Update the payment status of an existing project."""

    project.status = status
    await session.commit()
    await session.refresh(project)

    return project


async def touch_last_queried(session: AsyncSession, project: Project) -> None:
    """Update the last_queried_at timestamp to now."""

    project.last_queried_at = func.now()
    await session.commit()


async def delete_project(session: AsyncSession, project: Project) -> None:
    """Delete a project."""

    await session.delete(project)
    await session.commit()
