"""Add last_queried_at column to projects

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '0007'
down_revision: str | None = '0006'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'projects',
        sa.Column(
            'last_queried_at', sa.DateTime(timezone=True),
            nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_column('projects', 'last_queried_at')
