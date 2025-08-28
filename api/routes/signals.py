from flask import Blueprint, request, jsonify
from middleware.auth import token_required, get_current_user_id, get_current_user_email, get_current_access_token
from services.auth_service import get_or_create_user, ensure_user_has_credentials
from services.signal_service import (
    get_user_signals, create_signal, update_signal, delete_signal_with_cleanup,
    get_signal_details, execute_signal, delete_signal_run
)
from services.worker_service import run_worker_cycle_logic
from config.database import db

signals_bp = Blueprint('signals', __name__)

@signals_bp.route("/api/signals", methods=["GET"])
@token_required
def get_signals():
    """Get all signals with run counts for the authenticated user"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
        
        result = get_user_signals(user_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch signals", "details": str(e)}), 500

@signals_bp.route("/api/signals", methods=["POST"])
@token_required
def create_signal_route():
    """Create a new signal"""
    try:
        data = request.get_json()
        
        required_fields = ["name", "question", "answerOptions", "voteCount", "runFrequency"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        user_id = get_current_user_id()
        user_email = get_current_user_email()
        
        if not user_id or not user_email:
            return jsonify({"error": "User information not available from token"}), 400
        
        # Ensure user exists
        user = get_or_create_user(user_id, user_email)
        
        # Ensure user has credentials
        access_token = get_current_access_token()
        if not access_token:
            return jsonify({"error": "Access token not available"}), 400
            
        if not ensure_user_has_credentials(user, access_token):
            return jsonify({"error": "Failed to generate required client credentials"}), 500
        
        # Validate runFrequency
        valid_frequencies = ['hourly', 'daily', 'weekly', 'monthly']
        if data["runFrequency"] not in valid_frequencies:
            return jsonify({"error": f"Invalid runFrequency. Must be one of: {valid_frequencies}"}), 400

        signal = create_signal(user_id, data)
        
        # Trigger worker
        try:
            run_worker_cycle_logic()
        except Exception as e:
            print(f"Worker trigger failed: {e}")
        
        return jsonify({
            'id': signal.id,
            'name': signal.name,
            'question': signal.question,
            'answerOptions': signal.answerOptions,
            'voteCount': signal.voteCount,
            'countries': signal.countries,
            'runFrequency': signal.runFrequency,
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating signal: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to create signal", "details": str(e)}), 500

@signals_bp.route("/api/signals/<signal_id>", methods=["PATCH"])
@token_required
def update_signal_route(signal_id):
    """Update a signal (mainly for activate/deactivate)"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
        
        data = request.get_json()
        
        if "active" in data and not isinstance(data["active"], bool):
            return jsonify({"error": "Active field must be boolean"}), 400
        
        signal = update_signal(signal_id, user_id, data)
        if not signal:
            return jsonify({"error": "Signal not found or access denied"}), 404
        
        return jsonify({
            'id': signal.id,
            'name': signal.name,
            'question': signal.question,
            'answerOptions': signal.answerOptions,
            'voteCount': signal.voteCount,
            'countries': signal.countries,
            'runFrequency': signal.runFrequency,
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update signal", "details": str(e)}), 500

@signals_bp.route("/api/signals/<signal_id>", methods=["DELETE"])
@token_required
def delete_signal_route(signal_id):
    """Delete a signal and all its runs"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
        
        success = delete_signal_with_cleanup(signal_id, user_id)
        if not success:
            return jsonify({"error": "Signal not found or access denied"}), 404
        
        return jsonify({"success": True, "message": "Signal and all associated data deleted successfully"})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting signal: {e}")
        return jsonify({"error": "Failed to delete signal", "details": str(e)}), 500

@signals_bp.route("/api/signals/<signal_id>/details", methods=["GET"])
@token_required
def get_signal_details_route(signal_id):
    """Get detailed signal information including runs and responses"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
        
        details = get_signal_details(signal_id, user_id)
        if not details:
            return jsonify({"error": "Signal not found or access denied"}), 404
        
        return jsonify(details)
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch signal details", "details": str(e)}), 500

@signals_bp.route("/api/signals/execute", methods=["POST"])
@token_required
def execute_signal_route():
    """Execute a signal by creating a run"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
        
        data = request.get_json()
        
        if not data or "signalId" not in data:
            return jsonify({"error": "Signal ID is required"}), 400
        
        signal_run = execute_signal(data["signalId"], user_id)
        if not signal_run:
            return jsonify({"error": "Signal not found, access denied, or signal is not active"}), 400
        
        # Trigger worker
        try:
            run_worker_cycle_logic()
        except Exception as e:
            print(f"Worker trigger failed: {e}")
        
        return jsonify({
            "success": True,
            "signalRunId": signal_run.id,
            "status": signal_run.status,
            "message": "Signal run created and worker triggered immediately"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to execute signal", "details": str(e)}), 500

@signals_bp.route("/api/signals/<signal_id>/runs/<run_id>", methods=["DELETE"])
@token_required
def delete_run_route(signal_id, run_id):
    """Delete a specific run"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "User ID not available"}), 400
        
        success = delete_signal_run(signal_id, run_id, user_id)
        if not success:
            return jsonify({"error": "Signal or run not found, or access denied"}), 404
        
        return jsonify({"success": True, "message": "Run deleted successfully"})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting run: {e}")
        return jsonify({"error": "Failed to delete run", "details": str(e)}), 500