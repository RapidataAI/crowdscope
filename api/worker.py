import threading
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from services.worker_service import run_worker_cycle_logic
from config.settings import get_config
import os

# Get database URL from config
config = get_config()
engine = create_engine(config.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Worker lock key
WORKER_LOCK_KEY = 1234567890
WORKER_ID = 'crowdscope-worker'

def acquire_worker_lock():
    """Acquire exclusive worker lock using PostgreSQL advisory lock"""
    session = SessionLocal()
    try:
        result = session.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": WORKER_LOCK_KEY}).scalar()
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
            session.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": WORKER_LOCK_KEY})
            session.close()
            print(f"Worker {WORKER_ID} released lock")
    except Exception as e:
        print(f"Error releasing worker lock: {e}")

def run_worker_cycle():
    """Run a single worker cycle with locking"""
    lock_session = None
    try:
        lock_session = acquire_worker_lock()
        if not lock_session:
            return False
        
        success = run_worker_cycle_logic()
        return success
        
    except Exception as e:
        print(f"Worker error: {e}")
        return False
    finally:
        if lock_session:
            release_worker_lock(lock_session)

def worker_loop():
    """Main worker loop that runs every minute"""
    print(f"Background worker {WORKER_ID} started")
    
    while True:
        try:
            time.sleep(60)  # Wait 60 seconds between cycles
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