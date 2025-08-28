from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from typing import List
from dotenv import load_dotenv
from models import db, User, Signal, SignalRun, Response
from datetime import datetime
from sqlalchemy import func
from worker import start_background_worker, trigger_worker_immediately, run_worker_cycle
from auth import init_auth, token_required, get_current_user_id, get_current_user_email, generate_client_credentials, get_current_access_token
from flask_migrate import Migrate

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5433/crowdscope')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database, migrations, and auth
db.init_app(app)
migrate = Migrate(app, db)
init_auth()

# Auto-run migrations on startup
def run_migrations():
    """Automatically run database migrations on startup"""
    try:
        from flask_migrate import upgrade
        with app.app_context():
            upgrade()
            print("Database migrations applied successfully!")
    except Exception as e:
        print(f"Migration error: {e}")

# Run migrations on startup
run_migrations()

# Only start background worker in local development, not on Vercel
if os.getenv('VERCEL') != '1':
    # Start background worker (protected by database lock)
    start_background_worker()

def ensure_user_has_credentials(user, access_token):
    """Ensure user has Rapidata client credentials, generate if missing"""
    if not user.rapidataClientId or not user.rapidataClientSecret:
        print(f"Generating client credentials for user {user.id}")
        credentials = generate_client_credentials(access_token)
        if credentials:
            user.rapidataClientId = credentials['client_id']
            user.rapidataClientSecret = credentials['client_secret']
            db.session.commit()
            print(f"Successfully generated credentials for user {user.id}")
            return True
        else:
            print(f"Failed to generate credentials for user {user.id}")
            return False
    return True

# Health check
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "crowdscope-backend"})

# Signals CRUD endpoints
@app.route("/api/signals", methods=["GET"])
@token_required
def get_signals():
    """Get all signals with run counts for the authenticated user"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
            
        signals = db.session.query(
            Signal, 
            func.count(SignalRun.id).label('run_count')
        ).outerjoin(SignalRun).filter(Signal.createdBy == user_id).group_by(Signal.id).order_by(Signal.createdAt.desc()).all()
        
        result = []
        for signal, run_count in signals:
            result.append({
                'id': signal.id,
                'name': signal.name,
                'question': signal.question,
                'answerOptions': signal.answerOptions,  # Use model's camelCase attribute
                'voteCount': signal.voteCount,          # Use model's camelCase attribute
                'countries': signal.countries,          # Array of country codes
                'runFrequency': signal.runFrequency,    # Add runFrequency to response
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
@token_required
def create_signal():
    """Create a new signal"""
    try:
        data = request.get_json()
        
        required_fields = ["name", "question", "answerOptions", "voteCount", "runFrequency"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Get user info from authenticated token
        user_id = get_current_user_id()
        user_email = get_current_user_email()
        
        if not user_id or not user_email:
            return jsonify({"error": "User information not available from token"}), 400
        
        # Ensure user exists in database
        user = db.session.get(User, user_id)
        if not user:
            user = User(id=user_id, email=user_email)
            db.session.add(user)
            db.session.flush()  # Flush to get the user ID for credential generation
        
        # Ensure user has Rapidata client credentials
        access_token = get_current_access_token()
        if not access_token:
            return jsonify({"error": "Access token not available"}), 400
            
        if not ensure_user_has_credentials(user, access_token):
            return jsonify({"error": "Failed to generate required client credentials"}), 500
        
        # Validate runFrequency
        valid_frequencies = ['hourly', 'daily', 'weekly', 'monthly']
        if data["runFrequency"] not in valid_frequencies:
            return jsonify({"error": f"Invalid runFrequency. Must be one of: {valid_frequencies}"}), 400

        # Create signal
        signal = Signal(
            name=data["name"],
            question=data["question"],
            answerOptions=data["answerOptions"],  # Use camelCase column name
            voteCount=int(data["voteCount"]),     # Use camelCase column name
            countries=data.get("countries"),      # Optional array of country codes
            runFrequency=data["runFrequency"],    # Add runFrequency field
            createdBy=user_id                     # Use authenticated user ID
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
            'countries': signal.countries,          # Array of country codes
            'runFrequency': signal.runFrequency,    # Add runFrequency to response
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
@token_required
def update_signal(signal_id):
    """Update a signal (mainly for activate/deactivate)"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
            
        signal = db.session.get(Signal, signal_id)
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
            
        # Check if user owns this signal
        if signal.createdBy != user_id:
            return jsonify({"error": "Access denied"}), 403
        
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
            'countries': signal.countries,          # Array of country codes
            'runFrequency': signal.runFrequency,    # Add runFrequency to response
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat()  # Use model's camelCase attribute
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update signal", "details": str(e)}), 500

@app.route("/api/signals/execute", methods=["POST"])
@token_required
def execute_signal():
    """Execute a signal by creating a run in 'created' status"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
            
        data = request.get_json()
        
        if not data or "signalId" not in data:
            return jsonify({"error": "Signal ID is required"}), 400
        
        signal = db.session.get(Signal, data["signalId"])
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
            
        # Check if user owns this signal
        if signal.createdBy != user_id:
            return jsonify({"error": "Access denied"}), 403
        
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

@app.route("/api/signals/<signal_id>/runs/<run_id>", methods=["DELETE"])
@token_required
def delete_run(signal_id, run_id):
    """Delete a specific run and its Rapidata order if not completed"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
            
        # Get the signal first to check ownership
        signal = db.session.get(Signal, signal_id)
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
            
        # Check if user owns this signal
        if signal.createdBy != user_id:
            return jsonify({"error": "Access denied"}), 403
            
        # Get the run
        run = db.session.get(SignalRun, run_id)
        if not run or run.signalId != signal_id:
            return jsonify({"error": "Run not found"}), 404
            
        # Delete Rapidata order if run is not completed and has an order ID
        if run.status != 'completed' and run.rapidataOrderId:
            try:
                # Get user credentials for Rapidata API
                user = db.session.get(User, user_id)
                if user and user.rapidataClientId and user.rapidataClientSecret:
                    from rapidata import RapidataClient
                    rapi = RapidataClient(
                        client_id=user.rapidataClientId,
                        client_secret=user.rapidataClientSecret
                    )
                    
                    # Get the order and delete it
                    order = rapi.order.get_order_by_id(run.rapidataOrderId)
                    order.delete()
                    print(f"Deleted Rapidata order {run.rapidataOrderId} for run {run_id}")
                    
            except Exception as e:
                print(f"Error deleting Rapidata order: {e}")
                # Continue with database deletion even if Rapidata deletion fails
        
        # Delete the run (this will cascade delete responses due to database rules)
        db.session.delete(run)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Run deleted successfully"})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting run: {e}")
        return jsonify({"error": "Failed to delete run", "details": str(e)}), 500

@app.route("/api/signals/<signal_id>", methods=["DELETE"])
@token_required
def delete_signal(signal_id):
    """Delete a signal and all its runs, including Rapidata orders for non-completed runs"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
            
        # Get the signal
        signal = db.session.get(Signal, signal_id)
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
            
        # Check if user owns this signal
        if signal.createdBy != user_id:
            return jsonify({"error": "Access denied"}), 403
            
        # Get user credentials for Rapidata API
        user = db.session.get(User, user_id)
        if user and user.rapidataClientId and user.rapidataClientSecret:
            # Get all runs for this signal that have Rapidata orders
            runs_with_orders = db.session.query(SignalRun).filter(
                SignalRun.signalId == signal_id,
                SignalRun.rapidataOrderId.isnot(None),
                SignalRun.status != 'completed'  # Only delete non-completed orders
            ).all()
            
            if runs_with_orders:
                try:
                    from rapidata import RapidataClient
                    rapi = RapidataClient(
                        client_id=user.rapidataClientId,
                        client_secret=user.rapidataClientSecret
                    )
                    
                    # Delete each Rapidata order
                    for run in runs_with_orders:
                        try:
                            order = rapi.order.get_order_by_id(run.rapidataOrderId)
                            order.delete()
                            print(f"Deleted Rapidata order {run.rapidataOrderId} for run {run.id}")
                        except Exception as e:
                            print(f"Error deleting Rapidata order {run.rapidataOrderId}: {e}")
                            # Continue with other deletions
                            
                except Exception as e:
                    print(f"Error initializing Rapidata client: {e}")
                    # Continue with database deletion
        
        # Delete the signal (this will cascade delete all runs and responses due to database rules)
        db.session.delete(signal)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Signal and all associated data deleted successfully"})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting signal: {e}")
        return jsonify({"error": "Failed to delete signal", "details": str(e)}), 500

@app.route("/api/signals/<signal_id>/details", methods=["GET"])
@token_required
def get_signal_details(signal_id):
    """Get detailed signal information including runs and responses"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
            
        # Get the signal
        signal = db.session.get(Signal, signal_id)
        if not signal:
            return jsonify({"error": "Signal not found"}), 404
            
        # Check if user owns this signal
        if signal.createdBy != user_id:
            return jsonify({"error": "Access denied"}), 403
        
        # Get all runs with their responses (including non-completed ones)
        completed_runs = db.session.query(SignalRun).filter(
            SignalRun.signalId == signal_id
        ).order_by(SignalRun.startedAt.desc()).all()
        
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
                'status': run.status,
                'startedAt': run.startedAt.isoformat() if run.startedAt else None,
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
            'countries': signal.countries,
            'runFrequency': signal.runFrequency,    # Add runFrequency to response
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat(),
            'runs': runs_data
        })
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch signal details", "details": str(e)}), 500

# Worker endpoint for Vercel Cron Jobs
@app.route("/api/worker", methods=["GET", "POST"])
def worker():
    """Worker endpoint that runs the background tasks"""
    try:
        print("Worker endpoint triggered")
        success = run_worker_cycle()
        if success:
            return jsonify({"success": True, "message": "Worker cycle completed"})
        else:
            return jsonify({"success": False, "message": "Worker cycle failed"}), 500
    except Exception as e:
        print(f"Worker endpoint error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5328)
