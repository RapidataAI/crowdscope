from config.database import db
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class SignalRun(db.Model):
    __tablename__ = 'signal_runs'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    status = db.Column(db.String, default='created', nullable=False)
    rapidataOrderId = db.Column(db.String)
    startedAt = db.Column(db.DateTime, default=datetime.utcnow)
    completedAt = db.Column(db.DateTime)
    errorMessage = db.Column(db.String)
    
    # Foreign key
    signalId = db.Column(db.String, db.ForeignKey('signals.id'), nullable=False)
    
    # Relationships
    signal = db.relationship('Signal', back_populates='signal_runs')
    responses = db.relationship('Response', back_populates='signal_run', cascade='all, delete-orphan')