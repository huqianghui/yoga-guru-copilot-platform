"""add skills table, agent_skills table, system agent fields

Revision ID: 10cc27f6f94e
Revises: f03e8bf386a6
Create Date: 2026-03-15 07:51:45.866192

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


# revision identifiers, used by Alembic.
revision: str = '10cc27f6f94e'
down_revision: Union[str, None] = 'f03e8bf386a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(name: str) -> bool:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    return name in inspector.get_table_names()


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    return any(c["name"] == column for c in inspector.get_columns(table))


def upgrade() -> None:
    # --- New tables (idempotent: skip if already created by create_all) ---
    if not _table_exists('skills'):
        op.create_table(
        'skills',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('skill_type', sa.String(length=20), nullable=False, server_default='managed'),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        sa.Column('input_schema', sa.JSON(), nullable=True),
        sa.Column('available', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
        op.create_index(op.f('ix_skills_name'), 'skills', ['name'], unique=True)

    if not _table_exists('agent_skills'):
        op.create_table(
            'agent_skills',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('agent_name', sa.String(length=50), nullable=False),
        sa.Column('skill_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('agent_name', 'skill_id', name='uq_agent_skill'),
    )
        op.create_index(op.f('ix_agent_skills_agent_name'), 'agent_skills', ['agent_name'])
        op.create_index(op.f('ix_agent_skills_skill_id'), 'agent_skills', ['skill_id'])

    # --- New columns on agent_configs (idempotent) ---
    if not _column_exists('agent_configs', 'agent_type'):
        op.add_column('agent_configs', sa.Column('agent_type', sa.String(length=20), nullable=False, server_default='copilot'))
        op.add_column('agent_configs', sa.Column('modes', sa.JSON(), nullable=True))
        op.add_column('agent_configs', sa.Column('version', sa.String(length=100), nullable=True))
        op.add_column('agent_configs', sa.Column('provider', sa.String(length=100), nullable=True))
        op.add_column('agent_configs', sa.Column('model_name', sa.String(length=100), nullable=True))
        op.add_column('agent_configs', sa.Column('install_hint', sa.String(length=255), nullable=True))
        op.add_column('agent_configs', sa.Column('tools', sa.JSON(), nullable=True))
        op.add_column('agent_configs', sa.Column('mcp_servers', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('agent_configs', 'mcp_servers')
    op.drop_column('agent_configs', 'tools')
    op.drop_column('agent_configs', 'install_hint')
    op.drop_column('agent_configs', 'model_name')
    op.drop_column('agent_configs', 'provider')
    op.drop_column('agent_configs', 'version')
    op.drop_column('agent_configs', 'modes')
    op.drop_column('agent_configs', 'agent_type')
    op.drop_index(op.f('ix_agent_skills_skill_id'), table_name='agent_skills')
    op.drop_index(op.f('ix_agent_skills_agent_name'), table_name='agent_skills')
    op.drop_table('agent_skills')
    op.drop_index(op.f('ix_skills_name'), table_name='skills')
    op.drop_table('skills')
