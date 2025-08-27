from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from typing import List
from dotenv import load_dotenv
from models import db, User, Signal, SignalRun, Response
from datetime import datetime
from sqlalchemy import func
from worker import start_background_worker, trigger_worker_immediately

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/crowdscope')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

#Create tables and start background worker
# with app.app_context():
#     try:
#         # Drop and recreate tables to add new columns
#         db.drop_all()
#         db.create_all()
#         print("Database tables recreated successfully!")
#     except Exception as e:
#         print(f"Database error: {e}")

# Start background worker (protected by database lock)
start_background_worker()

# Health check
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "crowdscope-backend"})

# Signals CRUD endpoints
@app.route("/api/signals", methods=["GET"])
def get_signals():
    """Get all signals with run counts"""
    try:
        signals = db.session.query(
            Signal, 
            func.count(SignalRun.id).label('run_count')
        ).outerjoin(SignalRun).group_by(Signal.id).order_by(Signal.createdAt.desc()).all()
        
        result = []
        for signal, run_count in signals:
            result.append({
                'id': signal.id,
                'name': signal.name,
                'question': signal.question,
                'answerOptions': signal.answerOptions,  # Use model's camelCase attribute
                'voteCount': signal.voteCount,          # Use model's camelCase attribute
                'active': signal.active,
                'createdAt': signal.createdAt.isoformat(),  # Use model's camelCase attribute
                '_count': {
                    'signalRuns': run_count
                }
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Failed to fetch signals", "details": str(e)}), 500

@app.route("/api/signals", methods=["POST"])
def create_signal():
    """Create a new signal"""
    try:
        data = request.get_json()
        
        required_fields = ["name", "question", "answerOptions", "voteCount", "createdBy", "userEmail"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Ensure user exists in database
        user = db.session.get(User, data["createdBy"])
        if not user:
            user = User(id=data["createdBy"], email=data["userEmail"])
            db.session.add(user)
        
        # Create signal
        signal = Signal(
            name=data["name"],
            question=data["question"],
            answerOptions=data["answerOptions"],  # Use camelCase column name
            voteCount=int(data["voteCount"]),     # Use camelCase column name
            createdBy=data["createdBy"]           # Use camelCase column name
        )
        
        db.session.add(signal)
        db.session.commit()
        
        trigger_worker_immediately()
        
        return jsonify({
            'id': signal.id,
            'name': signal.name,
            'question': signal.question,
            'answerOptions': signal.answerOptions,  # Use model's camelCase attribute
            'voteCount': signal.voteCount,          # Use model's camelCase attribute
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat()  # Use model's camelCase attribute
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating signal: {e}")  # Debug output
        import traceback
        traceback.print_exc()  # Full stack trace
        return jsonify({"error": "Failed to create signal", "details": str(e)}), 500

@app.route("/api/signals/<signal_id>", methods=["PATCH"])
def update_signal(signal_id):
    """Update a signal (mainly for activate/deactivate)"""
    try:
        signal = db.session.get(Signal, signal_id)
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
        
        data = request.get_json()
        
        if "active" in data:
            if not isinstance(data["active"], bool):
                return jsonify({"error": "Active field must be boolean"}), 400
            signal.active = data["active"]
            signal.updatedAt = datetime.utcnow()  # Use model's camelCase attribute
        
        db.session.commit()
        
        return jsonify({
            'id': signal.id,
            'name': signal.name,
            'question': signal.question,
            'answerOptions': signal.answerOptions,  # Use model's camelCase attribute
            'voteCount': signal.voteCount,          # Use model's camelCase attribute
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat()  # Use model's camelCase attribute
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update signal", "details": str(e)}), 500

@app.route("/api/signals/execute", methods=["POST"])
def execute_signal():
    """Execute a signal by creating a run in 'created' status"""
    try:
        data = request.get_json()
        
        if not data or "signalId" not in data:
            return jsonify({"error": "Signal ID is required"}), 400
        
        signal = db.session.get(Signal, data["signalId"])
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
        
        if not signal.active:
            return jsonify({"error": "Signal is not active"}), 400
        
        # Create signal run record with 'created' status
        signal_run = SignalRun(
            signalId=signal.id, 
            startedAt=datetime.utcnow(),
            status='created'  # Worker will process this
        )
        db.session.add(signal_run)
        db.session.commit()
        
        # Trigger the worker immediately to process this new run
        trigger_worker_immediately()
        
        return jsonify({
            "success": True,
            "signalRunId": signal_run.id,
            "status": signal_run.status,
            "message": "Signal run created and worker triggered immediately"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to execute signal", "details": str(e)}), 500

@app.route("/api/signals/<signal_id>/details", methods=["GET"])
def get_signal_details(signal_id):
    """Get detailed signal information including runs and responses"""
    try:
        # Get the signal
        signal = db.session.get(Signal, signal_id)
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
        
        # Get all completed runs with their responses
        completed_runs = db.session.query(SignalRun).filter(
            SignalRun.signalId == signal_id,
            SignalRun.status == 'completed'
        ).order_by(SignalRun.completedAt.asc()).all()
        
        # Build the response data
        runs_data = []
        for run in completed_runs:
            # Get responses for this run
            responses = db.session.query(Response).filter(
                Response.signalRunId == run.id
            ).all()
            
            # Calculate total votes and percentages
            total_votes = sum(r.voteCount for r in responses)
            response_data = {}
            percentages = {}
            
            for response in responses:
                response_data[response.option] = response.voteCount
                percentages[response.option] = (response.voteCount / total_votes * 100) if total_votes > 0 else 0
            
            runs_data.append({
                'id': run.id,
                'completedAt': run.completedAt.isoformat() if run.completedAt else None,
                'rapidataOrderId': run.rapidataOrderId,
                'totalVotes': total_votes,
                'responses': response_data,
                'percentages': percentages
            })
        
        # Return signal details with runs data
        return jsonify({
            'id': signal.id,
            'name': signal.name,
            'question': signal.question,
            'answerOptions': signal.answerOptions,
            'voteCount': signal.voteCount,
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat(),
            'runs': runs_data
        })
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch signal details", "details": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5328)