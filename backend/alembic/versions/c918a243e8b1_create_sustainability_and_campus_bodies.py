"""create_sustainability_and_campus_bodies

Revision ID: c918a243e8b1
Revises: df8a5576ed94
Create Date: 2026-10-11 14:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c918a243e8b1'
down_revision: Union[str, None] = 'df8a5576ed94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add extended campus block columns
    op.add_column('campus_blocks', sa.Column('area_unit', sa.String(length=16), server_default='sqm', nullable=False))
    op.add_column('campus_blocks', sa.Column('current_occupancy', sa.Integer(), nullable=True))
    op.add_column('campus_blocks', sa.Column('floors_count', sa.Integer(), nullable=True))
    op.add_column('campus_blocks', sa.Column('classrooms_count', sa.Integer(), nullable=True))
    op.add_column('campus_blocks', sa.Column('laboratories_count', sa.Integer(), nullable=True))
    op.add_column('campus_blocks', sa.Column('operating_hours_per_day', sa.Float(), nullable=True))
    op.add_column('campus_blocks', sa.Column('verification_status', sa.String(length=32), server_default='awaiting_verification', nullable=False))
    op.add_column('campus_blocks', sa.Column('metadata_json', sa.Text(), nullable=True))

    # 2. Create sustainability_recommendations table
    op.create_table('sustainability_recommendations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('campus_id', sa.String(length=36), nullable=False),
        sa.Column('block_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('priority', sa.String(length=16), nullable=False, server_default='medium'),
        sa.Column('proposed_action', sa.Text(), nullable=False),
        sa.Column('supporting_evidence', sa.Text(), nullable=False),
        sa.Column('related_sdgs', sa.String(length=128), nullable=False, server_default='[]'),
        sa.Column('potential_co2e_reduction_t_year', sa.Float(), nullable=True),
        sa.Column('calculation_rationale', sa.Text(), nullable=True),
        sa.Column('assumptions', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='proposed'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['campus_id'], ['campuses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['block_id'], ['campus_blocks.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sustainability_recommendations_campus_id'), 'sustainability_recommendations', ['campus_id'], unique=False)
    op.create_index(op.f('ix_sustainability_recommendations_block_id'), 'sustainability_recommendations', ['block_id'], unique=False)
    op.create_index(op.f('ix_sustainability_recommendations_category'), 'sustainability_recommendations', ['category'], unique=False)
    op.create_index(op.f('ix_sustainability_recommendations_status'), 'sustainability_recommendations', ['status'], unique=False)

    # 3. Create institutional_evidence table
    op.create_table('institutional_evidence',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('campus_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('reference_number', sa.String(length=64), nullable=False),
        sa.Column('reporting_period', sa.String(length=64), nullable=False),
        sa.Column('associated_sdgs', sa.String(length=128), nullable=False, server_default='[]'),
        sa.Column('framework_tags', sa.String(length=255), nullable=False, server_default='[]'),
        sa.Column('verification_status', sa.String(length=32), nullable=False, server_default='verified'),
        sa.Column('document_url_or_ref', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['campus_id'], ['campuses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_institutional_evidence_campus_id'), 'institutional_evidence', ['campus_id'], unique=False)
    op.create_index(op.f('ix_institutional_evidence_category'), 'institutional_evidence', ['category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_institutional_evidence_category'), table_name='institutional_evidence')
    op.drop_index(op.f('ix_institutional_evidence_campus_id'), table_name='institutional_evidence')
    op.drop_table('institutional_evidence')

    op.drop_index(op.f('ix_sustainability_recommendations_status'), table_name='sustainability_recommendations')
    op.drop_index(op.f('ix_sustainability_recommendations_category'), table_name='sustainability_recommendations')
    op.drop_index(op.f('ix_sustainability_recommendations_block_id'), table_name='sustainability_recommendations')
    op.drop_index(op.f('ix_sustainability_recommendations_campus_id'), table_name='sustainability_recommendations')
    op.drop_table('sustainability_recommendations')

    op.drop_column('campus_blocks', 'metadata_json')
    op.drop_column('campus_blocks', 'verification_status')
    op.drop_column('campus_blocks', 'operating_hours_per_day')
    op.drop_column('campus_blocks', 'laboratories_count')
    op.drop_column('campus_blocks', 'classrooms_count')
    op.drop_column('campus_blocks', 'floors_count')
    op.drop_column('campus_blocks', 'current_occupancy')
    op.drop_column('campus_blocks', 'area_unit')
