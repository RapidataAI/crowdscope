from datetime import datetime
from sqlalchemy import func
from models import Signal, SignalRun, Response, User
from config.database import db
from .rapidata_service import delete_rapidata_order

def get_user_signals(user_id, load_all=False):
    """Get all signals with run counts for a user, or all signals if load_all is True"""
    # Always join with User and get run counts, filter based on load_all
    query = db.session.query(
        Signal, 
        func.count(SignalRun.id).label('run_count'),
        User.email.label('creator_email')
    ).outerjoin(SignalRun).join(User, Signal.createdBy == User.id)
    
    # Filter by user if not loading all
    if not load_all:
        query = query.filter(Signal.createdBy == user_id)
    
    signals = query.group_by(Signal.id, User.email).order_by(Signal.createdAt.desc()).all()
    
    result = []
    for signal, run_count, creator_email in signals:
        result.append({
            'id': signal.id,
            'name': signal.name,
            'question': signal.question,
            'answerOptions': signal.answerOptions,
            'voteCount': signal.voteCount,
            'countries': signal.countries,
            'runFrequency': signal.runFrequency,
            'isPublic': signal.isPublic,
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat(),
            'createdBy': signal.createdBy,
            'creatorEmail': creator_email,
            '_count': {
                'signalRuns': run_count
            }
        })
    return result

def create_signal(user_id, signal_data):
    """Create a new signal"""
    signal = Signal(
        name=signal_data["name"],
        question=signal_data["question"],
        answerOptions=signal_data["answerOptions"],
        voteCount=int(signal_data["voteCount"]),
        countries=signal_data.get("countries"),
        runFrequency=signal_data["runFrequency"],
        isPublic=bool(signal_data.get("isPublic", False)),
        createdBy=user_id
    )
    
    db.session.add(signal)
    db.session.commit()
    return signal

def update_signal(signal_id, user_id, update_data, is_admin=False):
    """Update a signal"""
    signal = db.session.get(Signal, signal_id)
    if not signal:
        return None
    # Only owner can update unless admin
    if not is_admin and signal.createdBy != user_id:
        return None
    
    if "active" in update_data:
        signal.active = update_data["active"]
        signal.updatedAt = datetime.utcnow()
    if "isPublic" in update_data and isinstance(update_data["isPublic"], bool):
        signal.isPublic = update_data["isPublic"]
        signal.updatedAt = datetime.utcnow()
    if is_admin and "countries" in update_data:
        # Allow admins to set countries to list or clear (None)
        countries = update_data["countries"]
        signal.countries = countries if countries is None or isinstance(countries, list) else signal.countries
        signal.updatedAt = datetime.utcnow()
    
    db.session.commit()
    return signal

def delete_signal_with_cleanup(signal_id, user_id):
    """Delete a signal and clean up associated Rapidata orders"""
    signal = db.session.get(Signal, signal_id)
    if not signal or signal.createdBy != user_id:
        return False
    
    user = db.session.get(User, user_id)
    if user and user.rapidataClientId and user.rapidataClientSecret:
        # Clean up Rapidata orders for non-completed runs
        runs_with_orders = db.session.query(SignalRun).filter(
            SignalRun.signalId == signal_id,
            SignalRun.rapidataOrderId.isnot(None),
            SignalRun.status != 'completed'
        ).all()
        
        for run in runs_with_orders:
            delete_rapidata_order(run.rapidataOrderId, user.rapidataClientId, user.rapidataClientSecret)
    
    db.session.delete(signal)
    db.session.commit()
    return True

def get_signal_details(signal_id, user_id, is_admin: bool = False):
    """Get detailed signal information including runs and responses.
    Admins may access any signal; non-admins may only access their own.
    """
    signal = db.session.get(Signal, signal_id)
    if not signal:
        return None
    # Only owner can access unless admin
    if not is_admin and signal.createdBy != user_id:
        return None
    
    # Get all runs with their responses
    runs = db.session.query(SignalRun).filter(
        SignalRun.signalId == signal_id
    ).order_by(SignalRun.startedAt.desc()).all()
    
    runs_data = []
    for run in runs:
        responses = db.session.query(Response).filter(
            Response.signalRunId == run.id
        ).all()
        
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
    
    return {
        'id': signal.id,
        'name': signal.name,
        'question': signal.question,
        'answerOptions': signal.answerOptions,
        'voteCount': signal.voteCount,
        'countries': signal.countries,
        'runFrequency': signal.runFrequency,
        'isPublic': signal.isPublic,
        'active': signal.active,
        'createdAt': signal.createdAt.isoformat(),
        'runs': runs_data
    }

def get_public_signals():
    """Get all public (and active) signals with run counts and creator email"""
    query = db.session.query(
        Signal,
        func.count(SignalRun.id).label('run_count'),
        User.email.label('creator_email')
    ).outerjoin(SignalRun).join(User, Signal.createdBy == User.id)

    query = query.filter(Signal.isPublic.is_(True))

    # It's reasonable to show only active public signals in the public listing
    query = query.filter(Signal.active.is_(True))

    signals = query.group_by(Signal.id, User.email).order_by(Signal.createdAt.desc()).all()

    result = []
    for signal, run_count, creator_email in signals:
        result.append({
            'id': signal.id,
            'name': signal.name,
            'question': signal.question,
            'answerOptions': signal.answerOptions,
            'voteCount': signal.voteCount,
            'countries': signal.countries,
            'runFrequency': signal.runFrequency,
            'isPublic': signal.isPublic,
            'active': signal.active,
            'createdAt': signal.createdAt.isoformat(),
            'createdBy': signal.createdBy,
            'creatorEmail': creator_email,
            '_count': {
                'signalRuns': run_count
            }
        })
    return result

def get_public_signal_details(signal_id):
    """Get details for a public signal (only if isPublic is True)."""
    signal = db.session.get(Signal, signal_id)
    if not signal or not signal.isPublic:
        return None

    # Optional: Only show details for active public signals
    # Remove this check if you want to show inactive ones too
    if not signal.active:
        return None

    runs = db.session.query(SignalRun).filter(
        SignalRun.signalId == signal_id
    ).order_by(SignalRun.startedAt.desc()).all()

    runs_data = []
    for run in runs:
        responses = db.session.query(Response).filter(
            Response.signalRunId == run.id
        ).all()

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

    return {
        'id': signal.id,
        'name': signal.name,
        'question': signal.question,
        'answerOptions': signal.answerOptions,
        'voteCount': signal.voteCount,
        'countries': signal.countries,
        'runFrequency': signal.runFrequency,
        'isPublic': signal.isPublic,
        'active': signal.active,
        'createdAt': signal.createdAt.isoformat(),
        'runs': runs_data
    }

def execute_signal(signal_id, user_id):
    """Execute a signal by creating a run"""
    signal = db.session.get(Signal, signal_id)
    if not signal or signal.createdBy != user_id or not signal.active:
        return None
    
    signal_run = SignalRun(
        signalId=signal.id, 
        startedAt=datetime.utcnow(),
        status='created'
    )
    db.session.add(signal_run)
    db.session.commit()
    return signal_run

def delete_signal_run(signal_id, run_id, user_id):
    """Delete a specific signal run"""
    signal = db.session.get(Signal, signal_id)
    if not signal or signal.createdBy != user_id:
        return False
    
    run = db.session.get(SignalRun, run_id)
    if not run or run.signalId != signal_id:
        return False
    
    # Delete Rapidata order if needed
    if run.status != 'completed' and run.rapidataOrderId:
        user = db.session.get(User, user_id)
        if user and user.rapidataClientId and user.rapidataClientSecret:
            delete_rapidata_order(run.rapidataOrderId, user.rapidataClientId, user.rapidataClientSecret)
    
    db.session.delete(run)
    db.session.commit()
    return True
