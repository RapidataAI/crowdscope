from config.database import db
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Response(db.Model):
    __tablename__ = 'responses'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    option = db.Column(db.String, nullable=False)
    voteCount = db.Column(db.Integer, nullable=False, default=0)
    
    # Foreign key
    signalRunId = db.Column(db.String, db.ForeignKey('signal_runs.id'), nullable=False)
    
    # Relationships
    signal_run = db.relationship('SignalRun', back_populates='responses')