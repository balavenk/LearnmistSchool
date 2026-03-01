"""add case insensitive username email constraints

Revision ID: e4b2f7c9a1d0
Revises: c8f9d2a1b7e3
Create Date: 2026-02-14

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'e4b2f7c9a1d0'
down_revision = 'c8f9d2a1b7e3'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username_lower ON users (lower(username))")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_lower ON users (lower(email))")


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_users_email_lower")
    op.execute("DROP INDEX IF EXISTS ix_users_username_lower")
