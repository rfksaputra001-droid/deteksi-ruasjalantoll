"""
Authentication Routes
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from bson import ObjectId
from app.config.database import get_collection
from app.models.user import (
    UserLoginRequest, UserRegisterRequest, ChangePasswordRequest,
    UserResponse, TokenResponse
)
from app.utils.jwt import generate_token
from app.utils.password import hash_password, verify_password
from app.utils.logger import logger
from app.middleware.auth import get_current_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(request: UserRegisterRequest, req: Request):
    """Register a new user"""
    try:
        users = get_collection("users")
        histori = get_collection("histori")
        
        # Check if user exists
        existing_user = await users.find_one({"emailUser": request.emailUser.lower()})
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Email sudah terdaftar"}
            )
        
        # Determine user role based on input or name
        user_role = request.role if hasattr(request, 'role') and request.role else "user"
        
        # Smart role detection based on name or email
        name_lower = request.namaUser.lower()
        email_lower = request.emailUser.lower()
        
        if "surveyor" in name_lower or "surveyor" in email_lower:
            user_role = "surveyor"
        elif "admin" in name_lower or "admin" in email_lower:
            user_role = "admin"
        
        # Create user
        user_data = {
            "namaUser": request.namaUser,
            "emailUser": request.emailUser.lower(),
            "passwordUser": hash_password(request.passwordUser),
            "role": user_role,
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await users.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        # Create history log
        await histori.insert_one({
            "idUser": result.inserted_id,
            "actionType": "UPLOAD",
            "description": f"User {request.namaUser} berhasil registrasi",
            "tanggal": datetime.utcnow(),
            "ipAddress": req.client.host if req.client else None,
            "createdAt": datetime.utcnow()
        })
        
        # Generate token
        token = generate_token(user_id)
        
        logger.info(f"New {user_role} registered: {request.emailUser}")
        
        return {
            "status": "success",
            "message": "Registrasi berhasil",
            "data": {
                "user": {
                    "id": user_id,
                    "nama": request.namaUser,
                    "email": request.emailUser,
                    "role": user_role
                },
                "token": token
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest):
    """Login user"""
    try:
        users = get_collection("users")
        
        logger.info(f"Login attempt for email: {request.emailUser}")
        
        # Find user
        user = await users.find_one({"emailUser": request.emailUser.lower()})
        
        if not user:
            logger.warning(f"Login failed - User not found: {request.emailUser}")
            raise HTTPException(
                status_code=401,
                detail={"status": "error", "message": "Email atau password salah"}
            )
        
        # Check if active
        if not user.get("isActive", True):
            logger.warning(f"Login failed - User inactive: {request.emailUser}")
            raise HTTPException(
                status_code=403,
                detail={"status": "error", "message": "Akun Anda telah dinonaktifkan"}
            )
        
        # Verify password
        if not verify_password(request.passwordUser, user.get("passwordUser", "")):
            logger.warning(f"Login failed - Wrong password for: {request.emailUser}")
            raise HTTPException(
                status_code=401,
                detail={"status": "error", "message": "Email atau password salah"}
            )
        
        # Update last login
        await users.update_one(
            {"_id": user["_id"]},
            {"$set": {"lastLogin": datetime.utcnow()}}
        )
        
        # Generate token
        user_id = str(user["_id"])
        token = generate_token(user_id)
        
        logger.info(f"User logged in: {request.emailUser}")
        
        return {
            "status": "success",
            "message": "Login berhasil",
            "data": {
                "user": {
                    "id": user_id,
                    "nama": user.get("namaUser"),
                    "email": user.get("emailUser"),
                    "role": user.get("role", "user")
                },
                "token": token
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return {
        "status": "success",
        "data": {
            "user": {
                "id": user["_id"],
                "namaUser": user.get("namaUser"),
                "emailUser": user.get("emailUser"),
                "role": user.get("role"),
                "isActive": user.get("isActive", True),
                "phoneNumber": user.get("phoneNumber"),
                "profileImage": user.get("profileImage"),
                "lastLogin": user.get("lastLogin"),
                "createdAt": user.get("createdAt")
            }
        }
    }


@router.put("/change-password")
async def change_password(request: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change user password"""
    try:
        users = get_collection("users")
        
        # Get user with password
        user_with_password = await users.find_one({"_id": ObjectId(user["_id"])})
        
        # Verify current password
        if not verify_password(request.currentPassword, user_with_password.get("passwordUser", "")):
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Password saat ini salah"}
            )
        
        # Update password
        await users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$set": {
                "passwordUser": hash_password(request.newPassword),
                "updatedAt": datetime.utcnow()
            }}
        )
        
        logger.info(f"Password changed for user: {user.get('emailUser')}")
        
        return {
            "status": "success",
            "message": "Password berhasil diubah"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Logout user (client-side token removal)"""
    logger.info(f"User logged out: {user.get('emailUser')}")
    return {
        "status": "success",
        "message": "Logout berhasil"
    }


@router.post("/create-test-user")
async def create_test_user():
    """Create a test user for debugging (REMOVE IN PRODUCTION)"""
    try:
        users = get_collection("users")
        
        # Check if test user exists
        existing = await users.find_one({"emailUser": "test@test.com"})
        if existing:
            return {
                "status": "success",
                "message": "Test user sudah ada",
                "data": {
                    "email": "test@test.com",
                    "password": "test123"
                }
            }
        
        # Create test user
        test_user = {
            "namaUser": "Test User",
            "emailUser": "test@test.com",
            "passwordUser": hash_password("test123"),
            "role": "surveyor",
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await users.insert_one(test_user)
        
        logger.info("Test user created: test@test.com")
        
        return {
            "status": "success",
            "message": "Test user berhasil dibuat",
            "data": {
                "email": "test@test.com",
                "password": "test123"
            }
        }
    except Exception as e:
        logger.error(f"Create test user error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
