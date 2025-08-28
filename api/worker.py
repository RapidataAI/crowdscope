import threading
import time
from datetime import datetime, timedelta
from typing import List
from sqlalchemy import create_engine, func, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from models import SignalRun, Signal, Response, User
import os
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

# Database setup for worker
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5433/crowdscope')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Global worker instance ID for this process
WORKER_ID = 'global-worker'

def acquire_worker_lock():
    """Acquire exclusive worker lock using PostgreSQL advisory lock"""
    session = SessionLocal()
    try:
        # Use PostgreSQL advisory lock with a fixed key (hash of 'crowdscope_worker')
        lock_key = 1234567890  # Fixed key for crowdscope worker
        result = session.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": lock_key}).scalar()
        if result:
            print(f"Worker {WORKER_ID} acquired lock")
            return session
        else:
            print(f"Worker {WORKER_ID} could not acquire lock - another worker is running")
            session.close()
            return None
    except Exception as e:
        print(f"Error acquiring worker lock: {e}")
        session.close()
        return None

def release_worker_lock(session):
    """Release the worker lock"""
    try:
        if session:
            lock_key = 1234567890
            session.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": lock_key})
            session.close()
            print(f"Worker {WORKER_ID} released lock")
    except Exception as e:
        print(f"Error releasing worker lock: {e}")

def trigger_worker_immediately():
    """Trigger the worker to run immediately"""
    print("Worker triggered immediately - running cycle now")
    # Run the worker cycle directly instead of using threading events
    run_worker_cycle()

def check_signals_need_runs():
    """Check for signals that need new runs based on their frequency settings"""
    session = SessionLocal()
    try:
        # Subquery to get the latest run for each signal
        latest_run_subquery = session.query(
            SignalRun.signalId,
            func.max(SignalRun.startedAt).label('latest_run')
        ).group_by(SignalRun.signalId).subquery()
        
        # Get all active signals with their latest run times
        signals_with_runs = session.query(Signal, latest_run_subquery.c.latest_run).outerjoin(
            latest_run_subquery, Signal.id == latest_run_subquery.c.signalId
        ).filter(Signal.active == True).all()
        
        signals_needing_runs = []
        now = datetime.utcnow()
        
        for signal, latest_run in signals_with_runs:
            needs_run = False
            
            if latest_run is None:
                # No previous runs - needs a run
                needs_run = True
            else:
                # Check if enough time has passed based on frequency
                if signal.runFrequency == 'hourly':
                    threshold = latest_run + timedelta(hours=1)
                elif signal.runFrequency == 'daily':
                    threshold = latest_run + timedelta(days=1)
                elif signal.runFrequency == 'weekly':
                    threshold = latest_run + timedelta(weeks=1)
                elif signal.runFrequency == 'monthly':
                    # Approximate month as 30 days
                    threshold = latest_run + timedelta(days=30)
                else:
                    # Default to daily if unknown frequency
                    threshold = latest_run + timedelta(days=1)
                
                if now >= threshold:
                    needs_run = True
            
            if needs_run:
                signals_needing_runs.append(signal)
        
        print(f"Found {len(signals_needing_runs)} signals that need new runs")
        
        # Create new runs for these signals
        for signal in signals_needing_runs:
            new_run = SignalRun(
                signalId=signal.id,
                status='created',
                startedAt=datetime.utcnow()
            )
            session.add(new_run)
            print(f"Created new run for signal {signal.id} ({signal.name}) - frequency: {signal.runFrequency}")
        
        session.commit()
        
    except Exception as e:
        print(f"Error in check_signals_need_runs: {e}")
        session.rollback()
    finally:
        session.close()

def process_created_runs():
    """Create rapidata orders for SignalRuns with 'created' status that don't have rapidata order IDs yet"""
    session = SessionLocal()
    try:
        # Get all runs in 'created' status that don't have rapidata order IDs yet
        created_runs = session.query(SignalRun).filter(
            SignalRun.status == 'created',
            SignalRun.rapidataOrderId.is_(None)
        ).all()
        
        print(f"Found {len(created_runs)} runs to create rapidata orders for")
        
        for run in created_runs:
            print(f"Processing run {run.id} for signal {run.signalId}")
            try:
                # Get the signal and user data
                signal = session.query(Signal).filter(Signal.id == run.signalId).first()
                if not signal:
                    run.status = 'failed'
                    run.errorMessage = 'Associated signal not found'
                    session.commit()
                    continue
                
                # Get the user's credentials
                user = session.query(User).filter(User.id == signal.createdBy).first()
                if not user or not user.rapidataClientId or not user.rapidataClientSecret:
                    run.status = 'failed'
                    run.errorMessage = 'User not found or missing client credentials'
                    session.commit()
                    continue
                
                user_credentials = {
                    'client_id': user.rapidataClientId,
                    'client_secret': user.rapidataClientSecret
                }
                
                # Create Rapidata order
                result = create_rapidata_order_worker({
                    "signal_id": signal.id,
                    "name": signal.name,
                    "question": signal.question,
                    "answer_options": signal.answerOptions,
                    "vote_count": signal.voteCount,
                    "countries": signal.countries
                }, user_credentials)
                
                if result["success"]:
                    # Update run with rapidata order id but keep status as 'created'
                    # Status will be updated to 'processing' by polling logic
                    run.status = 'processing'
                    run.rapidataOrderId = result["rapidata_order_id"]
                    print(f"Successfully created rapidata order for run {run.id}, order: {result['rapidata_order_id']}")
                else:
                    # Update run with failure
                    run.status = 'failed'
                    run.errorMessage = result.get("details", result.get("error", "Unknown error"))
                    print(f"Failed to create rapidata order for run {run.id}: {run.errorMessage}")
                
                session.commit()
                
            except Exception as e:
                # Handle individual run failure
                run.status = 'failed'
                run.errorMessage = str(e)
                session.commit()
                print(f"Error processing run {run.id}: {e}")
                
    except Exception as e:
        print(f"Error in process_created_runs: {e}")
    finally:
        session.close()

def create_rapidata_order_worker(signal_data, user_credentials):
    """Create a Rapidata order for a CrowdScope signal (worker version)"""
    try:
        # Import rapidata - should work since it's in the same environment
        from rapidata import RapidataClient, CountryFilter
        
        # Initialize Rapidata client with user's credentials
        rapi = RapidataClient(
            client_id=user_credentials['client_id'],
            client_secret=user_credentials['client_secret']
        )
        
        # Create the survey order
        order_kwargs = {
            "name": f"CrowdScope Signal: {signal_data['name']}",
            "instruction": signal_data["question"],
            "answer_options": signal_data["answer_options"],
            "datapoints": ["../public/questionmark.jpg"],
            "responses_per_datapoint": signal_data["vote_count"]
        }
        
        # Add country filter if specified
        if signal_data.get("countries"):
            order_kwargs["filters"] = [CountryFilter(signal_data["countries"])]
        
        order = rapi.order.create_classification_order(**order_kwargs)
        
        # Start the order
        order.run()

        print(order.id)

        return {
            "success": True,
            "rapidata_order_id": str(order.id) if hasattr(order, 'id') else "unknown",
            "message": f"Successfully created Rapidata order for signal {signal_data['signal_id']}"
        }
        
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": "Failed to create Rapidata order",
            "details": f"{str(e)}\n{traceback.format_exc()}"
        }

def poll_rapidata_orders():
    """Poll rapidata orders for runs that have rapidata order IDs but are still in 'created' status or are in 'processing' status"""
    session = SessionLocal()
    try:
        # Get runs that have rapidata order IDs but are in 'created' status (need to be moved to processing)
        # OR runs that are in 'processing' status (need status check)
        runs_to_check = session.query(SignalRun).filter(
            SignalRun.rapidataOrderId.isnot(None),
            SignalRun.status.in_(['processing'])
        ).all()
        
        print(f"Found {len(runs_to_check)} runs to poll rapidata orders for")
        
        for run in runs_to_check:
            try:
                # Get the signal and user data for credentials
                signal = session.query(Signal).filter(Signal.id == run.signalId).first()
                if not signal:
                    print(f"Signal not found for run {run.id}")
                    continue
                    
                user = session.query(User).filter(User.id == signal.createdBy).first()
                if not user or not user.rapidataClientId or not user.rapidataClientSecret:
                    print(f"User credentials not found for run {run.id}")
                    continue
                
                # Import rapidata and initialize with user credentials
                from rapidata import RapidataClient
                rapi = RapidataClient(
                    client_id=user.rapidataClientId,
                    client_secret=user.rapidataClientSecret
                )
                
                # Get the rapidata order status
                order = rapi.order.get_order_by_id(run.rapidataOrderId)
                order_status = order.get_status()
                
                print(f"Run {run.id} - Rapidata order {run.rapidataOrderId} status: {order_status}")

                if order_status.lower() == 'failed':
                    run.status = 'failed'
                    run.errorMessage = 'Rapidata order failed during processing'
                    print(f"Failed run {run.id} - rapidata order failed during processing")
                elif order_status.lower() == 'completed':
                    # Extract results and create Response records
                    try:
                        results = order.get_results()
                        vote_counts = results['summary']  # e.g., {'Yes': 5, 'No': 3}
                        
                        print(f"Extracting results for run {run.id}: {vote_counts}")
                        
                        # Create Response records for each option
                        for option, count in vote_counts.items():
                            response = Response(
                                signalRunId=run.id,
                                option=option,
                                voteCount=count
                            )
                            session.add(response)
                        
                        run.status = 'completed'
                        run.completedAt = datetime.utcnow()
                        print(f"Completed run {run.id} - extracted {len(vote_counts)} vote counts")
                        
                    except Exception as e:
                        run.status = 'failed'
                        run.errorMessage = f'Failed to extract results: {str(e)}'
                        print(f"Failed to extract results for run {run.id}: {e}")
                
                session.commit()
                
            except Exception as e:
                print(f"Error polling rapidata order for run {run.id}: {e}")
                # Don't fail the run here, as this might be a temporary network issue
                
    except Exception as e:
        print(f"Error in poll_rapidata_orders: {e}")
    finally:
        session.close()

def run_worker_cycle():
    """Run a single worker cycle"""
    lock_session = None
    try:
        # Try to acquire exclusive lock
        lock_session = acquire_worker_lock()
        if not lock_session:
            print(f"Worker {WORKER_ID} could not acquire lock - another worker is running")
            return False
            
        print("=== Worker cycle starting ===")
        
        # Step 1: Check if any signals need new runs based on their frequency settings
        print("Step 1: Checking signals that need new runs...")
        check_signals_need_runs()
        
        # Step 2: Create rapidata orders for runs in 'created' state
        print("Step 2: Processing created runs...")
        process_created_runs()
        
        # Step 3: Poll rapidata orders for runs in 'created' or 'processing' state
        print("Step 3: Polling rapidata orders...")
        poll_rapidata_orders()
        
        print("=== Worker cycle completed ===")
        return True
        
    except Exception as e:
        print(f"Worker error: {e}")
        return False
    finally:
        # Always release the lock
        if lock_session:
            release_worker_lock(lock_session)

def worker_loop():
    """Main worker loop that runs every minute"""
    print(f"Background worker {WORKER_ID} started")
    
    while True:
        try:
            # Wait 60 seconds between cycles
            time.sleep(60)
            
            # Run the worker cycle
            run_worker_cycle()
            
        except Exception as e:
            print(f"Worker loop error: {e}")
            time.sleep(5)  # Brief pause on error before retrying

def start_background_worker():
    """Start the background worker in a separate thread"""
    worker_thread = threading.Thread(target=worker_loop, daemon=True)
    worker_thread.start()
    print("Background worker thread started")
    return worker_thread
