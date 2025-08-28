from flask import Flask
from config.settings import get_config
from config.database import init_db, run_migrations
from middleware.cors import init_cors
from middleware.error_handler import init_error_handlers
from middleware.auth import init_auth
from routes.health import health_bp
from routes.signals import signals_bp
import os

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    app.config['SQLALCHEMY_DATABASE_URI'] = config.DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config['DEBUG'] = config.DEBUG
    
    # Initialize extensions
    init_db(app)
    init_cors(app)
    init_error_handlers(app)
    init_auth()
    
    # Register blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(signals_bp)
    
    # Run migrations on startup
    with app.app_context():
        run_migrations()
    
    # Start background worker
    from worker import start_background_worker
    start_background_worker()
    
    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5328)