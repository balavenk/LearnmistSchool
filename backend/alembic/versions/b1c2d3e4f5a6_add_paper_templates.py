"""Add paper templates

Revision ID: b1c2d3e4f5a6
Revises: ae682c467dad
Create Date: 2026-03-19 19:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'ae682c467dad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create paper_templates table
    op.create_table(
        'paper_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('total_marks', sa.Integer(), nullable=True),
        sa.Column('duration', sa.String(length=50), nullable=True),
        sa.Column('visibility', sa.String(length=20), nullable=False, server_default='private'),
        sa.Column('sections_config', sa.Text(), nullable=True),
        sa.Column('general_instructions', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_by_role', sa.String(length=50), nullable=True),
        sa.Column('cloned_from_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['cloned_from_id'], ['paper_templates.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_paper_templates_id'), 'paper_templates', ['id'], unique=False)

    # Add template_id FK to question_papers
    op.add_column('question_papers', sa.Column('template_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_question_papers_template_id',
        'question_papers', 'paper_templates',
        ['template_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_question_papers_template_id', 'question_papers', type_='foreignkey')
    op.drop_column('question_papers', 'template_id')
    op.drop_index(op.f('ix_paper_templates_id'), table_name='paper_templates')
    op.drop_table('paper_templates')
