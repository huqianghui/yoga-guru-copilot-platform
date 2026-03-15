"""add session mode, native_session_id, source fields

Revision ID: a1b2c3d4e5f6
Revises: 10cc27f6f94e
Create Date: 2026-03-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "10cc27f6f94e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("agent_sessions", sa.Column("mode", sa.String(20), nullable=False, server_default="ask"))
    op.add_column("agent_sessions", sa.Column("native_session_id", sa.String(200), nullable=True))
    op.add_column("agent_sessions", sa.Column("source", sa.String(50), nullable=False, server_default="playground"))


def downgrade() -> None:
    op.drop_column("agent_sessions", "source")
    op.drop_column("agent_sessions", "native_session_id")
    op.drop_column("agent_sessions", "mode")
