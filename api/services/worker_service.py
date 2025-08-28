from datetime import datetime, timedelta
from sqlalchemy import func, create_engine
from sqlalchemy.orm import sessionmaker
from models import SignalRun, Signal, Response, User
from .rapidata_service import create_rapidata_order, get_rapidata_order_status, get_rapidata_order_results
from config.settings import get_config
import os

# Create independent database session for worker
config = get_config()
engine = create_engine(config.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
                needs_run = True
            else:
                if signal.runFrequency == 'hourly':
                    threshold = latest_run + timedelta(hours=1)
                elif signal.runFrequency == 'daily':
                    threshold = latest_run + timedelta(days=1)
                elif signal.runFrequency == 'weekly':
                    threshold = latest_run + timedelta(weeks=1)
                elif signal.runFrequency == 'monthly':
                    threshold = latest_run + timedelta(days=30)
                else:
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
        raise
    finally:
        session.close()

def process_created_runs():
    """Create rapidata orders for SignalRuns with 'created' status"""
    session = SessionLocal()
    try:
        created_runs = session.query(SignalRun).filter(
            SignalRun.status == 'created',
            SignalRun.rapidataOrderId.is_(None)
        ).all()
        
        print(f"Found {len(created_runs)} runs to create rapidata orders for")
        
        for run in created_runs:
            print(f"Processing run {run.id} for signal {run.signalId}")
            try:
                signal = session.query(Signal).filter(Signal.id == run.signalId).first()
                if not signal:
                    run.status = 'failed'
                    run.errorMessage = 'Associated signal not found'
                    session.commit()
                    continue
                
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
                
                result = create_rapidata_order({
                    "signal_id": signal.id,
                    "name": signal.name,
                    "question": signal.question,
                    "answer_options": signal.answerOptions,
                    "vote_count": signal.voteCount,
                    "countries": signal.countries
                }, user_credentials)
                
                if result["success"]:
                    run.status = 'processing'
                    run.rapidataOrderId = result["rapidata_order_id"]
                    print(f"Successfully created rapidata order for run {run.id}, order: {result['rapidata_order_id']}")
                else:
                    run.status = 'failed'
                    run.errorMessage = result.get("details", result.get("error", "Unknown error"))
                    print(f"Failed to create rapidata order for run {run.id}: {run.errorMessage}")
                
                session.commit()
                
            except Exception as e:
                run.status = 'failed'
                run.errorMessage = str(e)
                session.commit()
                print(f"Error processing run {run.id}: {e}")
                
    except Exception as e:
        print(f"Error in process_created_runs: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def poll_rapidata_orders():
    """Poll rapidata orders for runs that are in 'processing' status"""
    session = SessionLocal()
    try:
        runs_to_check = session.query(SignalRun).filter(
            SignalRun.rapidataOrderId.isnot(None),
            SignalRun.status.in_(['processing'])
        ).all()
        
        print(f"Found {len(runs_to_check)} runs to poll rapidata orders for")
        
        for run in runs_to_check:
            try:
                signal = session.query(Signal).filter(Signal.id == run.signalId).first()
                if not signal:
                    print(f"Signal not found for run {run.id}")
                    continue
                    
                user = session.query(User).filter(User.id == signal.createdBy).first()
                if not user or not user.rapidataClientId or not user.rapidataClientSecret:
                    print(f"User credentials not found for run {run.id}")
                    continue
                
                order_status = get_rapidata_order_status(
                    run.rapidataOrderId, 
                    user.rapidataClientId, 
                    user.rapidataClientSecret
                )
                
                print(f"Run {run.id} - Rapidata order {run.rapidataOrderId} status: {order_status}")

                if order_status and order_status.lower() == 'failed':
                    run.status = 'failed'
                    run.errorMessage = 'Rapidata order failed during processing'
                    print(f"Failed run {run.id} - rapidata order failed during processing")
                elif order_status and order_status.lower() == 'completed':
                    try:
                        results = get_rapidata_order_results(
                            run.rapidataOrderId,
                            user.rapidataClientId,
                            user.rapidataClientSecret
                        )
                        
                        if results and 'summary' in results:
                            vote_counts = results['summary']
                            print(f"Extracting results for run {run.id}: {vote_counts}")
                            
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
                        else:
                            run.status = 'failed'
                            run.errorMessage = 'No results available from Rapidata order'
                            
                    except Exception as e:
                        run.status = 'failed'
                        run.errorMessage = f'Failed to extract results: {str(e)}'
                        print(f"Failed to extract results for run {run.id}: {e}")
                
                session.commit()
                
            except Exception as e:
                print(f"Error polling rapidata order for run {run.id}: {e}")
                
    except Exception as e:
        print(f"Error in poll_rapidata_orders: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def run_worker_cycle_logic():
    """Execute the core worker cycle logic"""
    try:
        print("=== Worker cycle starting ===")
        
        print("Step 1: Checking signals that need new runs...")
        check_signals_need_runs()
        
        print("Step 2: Processing created runs...")
        process_created_runs()
        
        print("Step 3: Polling rapidata orders...")
        poll_rapidata_orders()
        
        print("=== Worker cycle completed ===")
        return True
        
    except Exception as e:
        print(f"Error in worker cycle: {e}")
        import traceback
        traceback.print_exc()
        return False