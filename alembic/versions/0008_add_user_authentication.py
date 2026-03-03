"""Add user authentication

Revision ID: 0008
Revises: 0007
Create Date: 2026-03-01 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.add_column("projects", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("api_token", sa.String(length=64), nullable=True, unique=True))

    op.alter_column("projects", "user_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("projects", "api_token", existing_type=sa.String(64), nullable=False)

    op.create_foreign_key("fk_projects_user_id", "projects", "users", ["user_id"], ["id"])
    op.create_index("ix_projects_user_id", "projects", ["user_id"])
    op.create_index("ix_projects_api_token", "projects", ["api_token"], unique=True)


def downgrade() -> None:
    op.drop_constraint("fk_projects_user_id", "projects", type_="foreignkey")
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_index("ix_projects_api_token", table_name="projects")

    op.drop_column("projects", "api_token")
    op.drop_column("projects", "user_id")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
