import jwt
import requests
from functools import wraps
from flask import request, jsonify, current_app
from typing import Optional, Dict, Any
from jwt import PyJWKClient
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OIDCValidator:
    def __init__(self, issuer_url: str = "https://auth.rapidata.ai"):
        self.issuer_url = issuer_url
        self.jwks_client = PyJWKClient(f"{issuer_url}/.well-known/jwks.json")
    
    def validate_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        logger.debug(f"Validating token: {access_token[:50]}...")
        try:
            # Try userinfo endpoint first (works with both JWT and JWE tokens)
            response = requests.get(
                f"{self.issuer_url}/connect/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Userinfo endpoint returned status {response.status_code}")
                
        except requests.RequestException as e:
            logger.warning(f"Failed to validate token via userinfo endpoint: {e}")
            
        # Fallback: try to decode as plain JWT (for unencrypted tokens)
        try:
            # Check if token looks like a JWE (5 parts) vs JWT (3 parts)
            token_parts = access_token.split('.')
            if len(token_parts) == 5:
                logger.warning("Token appears to be JWE (encrypted), but userinfo endpoint failed")
                return None
                
            # Try JWT decoding
            signing_key = self.jwks_client.get_signing_key_from_jwt(access_token)
            payload = jwt.decode(
                access_token,
                signing_key.key,
                algorithms=["RS256"],
                audience=None,  # Skip audience validation for now
                issuer=self.issuer_url
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None

# Global validator instance
oidc_validator = None

def init_auth():
    """Initialize the OIDC validator"""
    global oidc_validator
    oidc_validator = OIDCValidator()
    logger.info("OIDC validator initialized")

def token_required(f):
    """Decorator that requires a valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Validate token
        if not oidc_validator:
            return jsonify({'error': 'Authentication not initialized'}), 500
            
        payload = oidc_validator.validate_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid'}), 401
        
        # Add user info to request context
        request.user_id = payload.get('sub')
        request.user_email = payload.get('email')
        request.user_payload = payload
        
        return f(*args, **kwargs)
    
    return decorated

def get_current_user_id() -> Optional[str]:
    """Get the current user ID from the request context"""
    return getattr(request, 'user_id', None)

def get_current_user_email() -> Optional[str]:
    """Get the current user email from the request context"""
    return getattr(request, 'user_email', None)

def get_current_user_payload() -> Optional[Dict[str, Any]]:
    """Get the current user's full JWT payload from the request context"""
    return getattr(request, 'user_payload', None)