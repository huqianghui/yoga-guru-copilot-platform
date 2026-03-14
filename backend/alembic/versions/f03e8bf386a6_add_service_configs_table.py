"""add service_configs table

Revision ID: f03e8bf386a6
Revises: 1f440edd8b81
Create Date: 2026-03-14 21:09:19.788215

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f03e8bf386a6'
down_revision: Union[str, None] = '1f440edd8b81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'service_configs',  # if_not_exists handled by SQLite; table may pre-exist from create_all()
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False, server_default=''),
        sa.Column('description', sa.String(500), nullable=False, server_default=''),
        sa.Column('category', sa.String(50), nullable=False, server_default='general'),
        sa.Column('is_secret', sa.Boolean(), nullable=False, server_default=sa.text('0')),
    )
    op.create_index('ix_service_configs_key', 'service_configs', ['key'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_service_configs_key', table_name='service_configs')
    op.drop_table('service_configs')
