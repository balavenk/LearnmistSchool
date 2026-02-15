"""add last_login to users

Revision ID: c8f9d2a1b7e3
Revises: add_email_to_students
Create Date: 2026-02-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8f9d2a1b7e3'
down_revision = 'add_email_to_students'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('last_login', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'last_login')
