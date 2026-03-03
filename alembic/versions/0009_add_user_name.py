"""Add user name field

Revision ID: 0009
Revises: 0008
Create Date: 2026-03-03 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=False, server_default="User"))
    op.alter_column("users", "name", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "name")
