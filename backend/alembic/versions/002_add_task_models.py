"""Add Task model enhancements, TaskActivity, AIPriorityScore, NotificationPreference

Revision ID: 002
Revises: 001
Create Date: 2026-11-19 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create task_activities table
    op.create_table(
        'task_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('old_value', postgresql.JSONB, nullable=True),
        sa.Column('new_value', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    op.create_index('ix_task_activities_task_created', 'task_activities', ['task_id', 'created_at'])

    # Create ai_priority_scores table
    op.create_table(
        'ai_priority_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Integer, nullable=False),
        sa.Column('reasoning', sa.Text, nullable=False),
        sa.Column('suggested_action', sa.String(50), nullable=False),
        sa.Column('model_version', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    op.create_index('ix_ai_priority_scores_task_created', 'ai_priority_scores', ['task_id', 'created_at'])

    # Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('email_enabled', sa.Boolean, default=True, nullable=False),
        sa.Column('push_enabled', sa.Boolean, default=False, nullable=False),
        sa.Column('task_assigned', sa.Boolean, default=True, nullable=False),
        sa.Column('task_updated', sa.Boolean, default=True, nullable=False),
        sa.Column('comments', sa.Boolean, default=True, nullable=False),
        sa.Column('mentions', sa.Boolean, default=True, nullable=False),
        sa.Column('weekly_digest', sa.Boolean, default=False, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('notification_preferences')
    op.drop_table('ai_priority_scores')
    op.drop_table('task_activities')