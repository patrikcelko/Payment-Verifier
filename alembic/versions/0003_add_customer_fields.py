"""Add customer_name, customer_address, project_url to projects

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-26
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '0003'
down_revision: str | None = '0002'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'projects',
        sa.Column('customer_name', sa.String(length=255), nullable=True)
    )
    op.add_column(
        'projects',
        sa.Column('customer_address', sa.Text(), nullable=True)
    )
    op.add_column(
        'projects',
        sa.Column('project_url', sa.String(length=500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('projects', 'project_url')
    op.drop_column('projects', 'customer_address')
    op.drop_column('projects', 'customer_name')
