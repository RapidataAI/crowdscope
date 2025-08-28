from config.database import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Signal(db.Model):
    __tablename__ = 'signals'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    name = db.Column(db.String, nullable=False)
    question = db.Column(db.String, nullable=False)
    answerOptions = db.Column(ARRAY(db.String), nullable=False)
    voteCount = db.Column(db.Integer, nullable=False)
    countries = db.Column(ARRAY(db.String), nullable=True)
    runFrequency = db.Column(db.String, nullable=False, default='daily')
    isPublic = db.Column(db.Boolean, nullable=False, default=False)
    active = db.Column(db.Boolean, default=True)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign key
    createdBy = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    user = db.relationship('User', back_populates='signals')
    signal_runs = db.relationship('SignalRun', back_populates='signal', cascade='all, delete-orphan')
