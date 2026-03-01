"""Create request_logs table

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-23
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '0002'
down_revision: str | None = '0001'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'request_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('project_name', sa.String(length=255), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('response_text', sa.String(length=255), nullable=False),
        sa.Column(
            'client_ip', sa.String(length=45), nullable=False, server_default='unknown'
        ),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_request_logs_project_name'), 'request_logs', ['project_name']
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_request_logs_project_name'), table_name='request_logs'
    )
    op.drop_table('request_logs')
