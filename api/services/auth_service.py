import requests
from models import User
from config.database import db

def generate_client_credentials(access_token):
    """Generate new client credentials from Rapidata auth service"""
    try:
        response = requests.post(
            "https://auth.rapidata.ai/client",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={},  # Send empty JSON payload as required by CreateClientModel
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                'client_id': data.get('clientId'),
                'client_secret': data.get('clientSecret')
            }
        else:
            print(f"Failed to generate client credentials: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.RequestException as e:
        print(f"Error generating client credentials: {e}")
        return None

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

def get_or_create_user(user_id, user_email):
    """Get existing user or create new one"""
    user = db.session.get(User, user_id)
    if not user:
        user = User(id=user_id, email=user_email)
        db.session.add(user)
        db.session.flush()
    return user