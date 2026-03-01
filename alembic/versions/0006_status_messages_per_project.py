"""Extend status_messages with per-project support

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("status_messages")

    op.create_table(
        "status_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
    )

    op.create_index(
        "ix_status_messages_project_id", "status_messages", ["project_id"]
    )

    op.execute(
        "CREATE UNIQUE INDEX uix_sm_global "
        "ON status_messages(status) WHERE project_id IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX uix_sm_project "
        "ON status_messages(project_id, status) WHERE project_id IS NOT NULL"
    )

    op.execute(
        "INSERT INTO status_messages (project_id, status, message) VALUES "
        "(NULL, 'UNPAID', 'Payment is required. Service access is restricted until payment is received.'), "
        "(NULL, 'OVERDUE', 'Payment is overdue. Service has been suspended due to non-payment.'), "
        "(NULL, 'PARTIAL', 'Partial payment received. Full payment is required to restore service access.'), "
        "(NULL, 'SUSPENDED', 'Service has been suspended. Please contact the administrator.')"
    )


def downgrade() -> None:
    op.drop_table("status_messages")

    op.create_table(
        "status_messages",
        sa.Column("status", sa.String(length=50), primary_key=True),
        sa.Column("message", sa.Text(), nullable=False),
    )

    op.execute(
        "INSERT INTO status_messages (status, message) VALUES "
        "('UNPAID', 'Payment is required. Service access is restricted until payment is received.'), "
        "('OVERDUE', 'Payment is overdue. Service has been suspended due to non-payment.'), "
        "('PARTIAL', 'Partial payment received. Full payment is required to restore service access.'), "
        "('SUSPENDED', 'Service has been suspended. Please contact the administrator.')"
    )
