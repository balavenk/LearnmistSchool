"""Merge heads

Revision ID: bcb7c81c2f1a
Revises: 3d2977f2e912, fdfaf8eddac2
Create Date: 2026-03-30 18:26:59.125473

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bcb7c81c2f1a'
down_revision: Union[str, Sequence[str], None] = ('3d2977f2e912', 'fdfaf8eddac2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
