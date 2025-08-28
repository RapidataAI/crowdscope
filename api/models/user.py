from config.database import db
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    email = db.Column(db.String, unique=True, nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Rapidata client credentials
    rapidataClientId = db.Column(db.String)
    rapidataClientSecret = db.Column(db.String)
    
    # Relationships
    signals = db.relationship('Signal', back_populates='user', cascade='all, delete-orphan')