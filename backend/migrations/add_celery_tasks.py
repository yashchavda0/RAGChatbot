"""Add celery_tasks table

Revision ID: add_celery_tasks
Revises: 
Create Date: 2026-06-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_celery_tasks'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create celery_tasks table."""
    op.create_table(
        'celery_tasks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('chatbot_id', sa.String(), nullable=False),
        sa.Column('task_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='pending'),
        sa.Column('progress', sa.Integer(), server_default='0'),
        sa.Column('message', sa.String(), server_default=''),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.Column('result', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('task_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_celery_tasks_chatbot_id', 'celery_tasks', ['chatbot_id'])
    op.create_index('idx_celery_tasks_status', 'celery_tasks', ['status'])
    op.create_index('idx_celery_tasks_task_type', 'celery_tasks', ['task_type'])
    op.create_index('idx_celery_tasks_created_at', 'celery_tasks', ['created_at'])


def downgrade():
    """Drop celery_tasks table."""
    op.drop_index('idx_celery_tasks_created_at', table_name='celery_tasks')
    op.drop_index('idx_celery_tasks_task_type', table_name='celery_tasks')
    op.drop_index('idx_celery_tasks_status', table_name='celery_tasks')
    op.drop_index('idx_celery_tasks_chatbot_id', table_name='celery_tasks')
    op.drop_table('celery_tasks')
