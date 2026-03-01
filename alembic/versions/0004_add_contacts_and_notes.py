"""Add contact fields and project_notes table

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-26
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("contact_person", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column("contact_email", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column("contact_phone", sa.String(length=50), nullable=True)
    )

    op.create_table(
        "project_notes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id", sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(),
            nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("project_notes")
    op.drop_column("projects", "contact_phone")
    op.drop_column("projects", "contact_email")
    op.drop_column("projects", "contact_person")
