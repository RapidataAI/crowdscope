"""add isPublic to signals

Revision ID: b1f2e3a4c5d6
Revises: 149169766376
Create Date: 2025-08-28 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1f2e3a4c5d6'
down_revision = '149169766376'
branch_labels = None
depends_on = None


def upgrade():
    # Add isPublic with default False
    with op.batch_alter_table('signals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('isPublic', sa.Boolean(), nullable=False, server_default=sa.false()))

    # Optional: drop server_default to avoid future default at DB level; keep application default
    with op.batch_alter_table('signals', schema=None) as batch_op:
        batch_op.alter_column('isPublic', server_default=None)


def downgrade():
    with op.batch_alter_table('signals', schema=None) as batch_op:
        batch_op.drop_column('isPublic')

