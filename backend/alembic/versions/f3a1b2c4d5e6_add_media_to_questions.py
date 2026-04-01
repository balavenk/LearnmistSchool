"""add media_url and media_type to questions

Revision ID: f3a1b2c4d5e6
Revises: ac32700886aa
Create Date: 2026-03-11 12:29:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f3a1b2c4d5e6'
down_revision = ('49db749eab61', '99cc69be998b')
branch_labels = None
depends_on = None


def upgrade():
    # op.add_column('questions', sa.Column('media_url', sa.String(500), nullable=True))
    # op.add_column('questions', sa.Column('media_type', sa.String(20), nullable=True))
    pass


def downgrade():
    op.drop_column('questions', 'media_type')
    op.drop_column('questions', 'media_url')
