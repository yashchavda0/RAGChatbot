---
name: create-migration
description: Create Alembic database migration for PostgreSQL schema changes
disable-model-invocation: true
---

Generate Alembic migration files for database schema changes.

## Usage
```
/create-migration <description> [--autogenerate] [--tables table1,table2]
```

## Migration Template
```python
"""add_feedback_table

Revision ID: xxx
"""
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    op.create_table(
        'feedback',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('rating', sa.Integer),
        sa.Column('comment', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

def downgrade() -> None:
    op.drop_table('feedback')
```

## Common Patterns
- `op.add_column()` - Add column
- `op.create_index()` - Add index
- `op.create_foreign_key()` - Add FK constraint
- `op.alter_column()` - Modify column

## Examples
```
/create-migration add_user_preferences_table
/create-migration add_document_tags_column
/create-migration add_vector_search_index --tables documents
```
