"""fix active column not null

Revision ID: 99cc69be998b
Revises: 4927b7eb638f
Create Date: 2026-02-24 18:11:24.830649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99cc69be998b'
down_revision: Union[str, Sequence[str], None] = '4927b7eb638f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
