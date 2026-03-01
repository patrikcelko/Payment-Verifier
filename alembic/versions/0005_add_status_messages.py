"""Add status_messages table

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = '0005'
down_revision: str | None = '0004'
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'status_messages',
        sa.Column('status', sa.String(length=50), primary_key=True),
        sa.Column('message', sa.Text(), nullable=False),
    )

    op.execute(
        "INSERT INTO status_messages (status, message) VALUES "
        "('UNPAID', 'Payment is required. Service access is restricted until payment is received.'), "
        "('OVERDUE', 'Payment is overdue. Service has been suspended due to non-payment.'), "
        "('PARTIAL', 'Partial payment received. Full payment is required to restore service access.'), "
        "('SUSPENDED', 'Service has been suspended. Please contact the administrator.')"
    )


def downgrade() -> None:
    op.drop_table('status_messages')
