"""
Authentication Middleware
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from app.utils.jwt import verify_token
from app.config.database import get_collection
from app.utils.logger import logger

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from token"""
    token = credentials.credentials
    
    # Verify token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "status": "error",
                "message": "Token tidak valid atau telah kadaluarsa. Silakan login kembali.",
                "code": "TOKEN_INVALID"
            }
        )
    
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "status": "error",
                "message": "Format token tidak valid. Silakan login kembali.",
                "code": "TOKEN_MALFORMED"
            }
        )
    
    # Get user from database
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "status": "error",
                "message": "Pengguna tidak ditemukan. Akun mungkin telah dihapus.",
                "code": "USER_NOT_FOUND"
            }
        )
    
    if not user.get("isActive", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "status": "error",
                "message": "Akun Anda telah dinonaktifkan. Hubungi administrator.",
                "code": "ACCOUNT_INACTIVE"
            }
        )
    
    # Convert ObjectId to string
    user["_id"] = str(user["_id"])
    
    return user


async def get_admin_user(user: dict = Depends(get_current_user)):
    """Get current user and verify admin role"""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "status": "error",
                "message": "Akses ditolak. Hanya admin yang dapat mengakses fitur ini.",
                "code": "ADMIN_REQUIRED"
            }
        )
    return user


async def get_surveyor_or_admin(user: dict = Depends(get_current_user)):
    """Get current user and verify surveyor or admin role"""
    if user.get("role") not in ["admin", "surveyor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "status": "error",
                "message": "Akses ditolak. Hanya surveyor atau admin yang dapat mengakses fitur ini.",
                "code": "SURVEYOR_OR_ADMIN_REQUIRED"
            }
        )
    return user
