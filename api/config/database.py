from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def init_db(app):
    """Initialize database with app"""
    db.init_app(app)
    migrate.init_app(app, db)
    
def run_migrations():
    """Automatically run database migrations on startup"""
    try:
        from flask_migrate import upgrade
        from flask import current_app
        with current_app.app_context():
            upgrade()
            print("Database migrations applied successfully!")
    except Exception as e:
        print(f"Migration error: {e}")