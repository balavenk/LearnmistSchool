"""add email to students

Revision ID: add_email_to_students
Revises: 7d05ecdcb3cd
Create Date: 2026-02-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_email_to_students'
down_revision = '7d05ecdcb3cd'
branch_labels = None
depends_on = None


def upgrade():
    # Add email column to students table
    op.add_column('students', sa.Column('email', sa.String(length=255), nullable=True))


def downgrade():
    # Remove email column from students table
    op.drop_column('students', 'email')
