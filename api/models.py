from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY
import uuid

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    email = db.Column(db.String, unique=True, nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    signals = db.relationship('Signal', back_populates='user', cascade='all, delete-orphan')

class Signal(db.Model):
    __tablename__ = 'signals'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    name = db.Column(db.String, nullable=False)
    question = db.Column(db.String, nullable=False)
    answerOptions = db.Column(ARRAY(db.String), nullable=False)  # Match Prisma column name
    voteCount = db.Column(db.Integer, nullable=False)  # Match Prisma column name
    active = db.Column(db.Boolean, default=True)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)  # Match Prisma column name
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Match Prisma column name
    
    # Foreign key
    createdBy = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)  # Match Prisma column name
    
    # Relationships
    user = db.relationship('User', back_populates='signals')
    signal_runs = db.relationship('SignalRun', back_populates='signal', cascade='all, delete-orphan')

class SignalRun(db.Model):
    __tablename__ = 'signal_runs'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    status = db.Column(db.String, default='created', nullable=False)  # created, processing, completed, failed
    rapidataOrderId = db.Column(db.String)  # Match Prisma column name
    startedAt = db.Column(db.DateTime, default=datetime.utcnow)  # Match Prisma column name
    completedAt = db.Column(db.DateTime)  # Match Prisma column name
    errorMessage = db.Column(db.String)  # Store error details if run fails
    
    # Foreign key
    signalId = db.Column(db.String, db.ForeignKey('signals.id'), nullable=False)  # Match Prisma column name
    
    # Relationships
    signal = db.relationship('Signal', back_populates='signal_runs')
    responses = db.relationship('Response', back_populates='signal_run', cascade='all, delete-orphan')

class Response(db.Model):
    __tablename__ = 'responses'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    option = db.Column(db.String, nullable=False)  # The answer option (e.g., "Yes", "No", "Option 1")
    voteCount = db.Column(db.Integer, nullable=False, default=0)  # Number of votes for this option
    
    # Foreign key
    signalRunId = db.Column(db.String, db.ForeignKey('signal_runs.id'), nullable=False)  # Match Prisma column name
    
    # Relationships
    signal_run = db.relationship('SignalRun', back_populates='responses')