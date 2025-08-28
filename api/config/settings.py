import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration class"""
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5433/crowdscope')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Auth settings
    OIDC_ISSUER_URL = os.getenv('OIDC_ISSUER_URL', 'https://auth.rapidata.ai')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('FLASK_ENV', 'production')
    if env == 'development':
        return DevelopmentConfig()
    return ProductionConfig()