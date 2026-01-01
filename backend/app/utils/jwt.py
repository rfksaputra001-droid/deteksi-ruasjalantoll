"""
JWT Utilities for Authentication
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.utils.logger import logger

SECRET_KEY = os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))


def generate_token(user_id: str) -> str:
    """Generate JWT token for user"""
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "id": str(user_id),
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"Token verification failed: {str(e)}")
        return None


def decode_token(token: str) -> Optional[str]:
    """Decode token and return user_id"""
    payload = verify_token(token)
    if payload:
        return payload.get("id")
    return None
