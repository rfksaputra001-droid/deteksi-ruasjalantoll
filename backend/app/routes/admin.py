"""
Admin Routes
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from app.config.database import get_collection
from app.models.user import UserCreate, UserUpdate, UserResponse
from app.utils.password import hash_password
from app.utils.logger import logger
from app.middleware.auth import get_admin_user

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(admin: dict = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    try:
        users = get_collection("users")
        deteksi = get_collection("deteksi")
        perhitungan = get_collection("perhitungan")
        
        # Count users by role
        total_users = await users.count_documents({})
        admin_count = await users.count_documents({"role": "admin"})
        surveyor_count = await users.count_documents({"role": "surveyor"})
        user_count = await users.count_documents({"role": "user"})
        active_users = await users.count_documents({"isActive": True})
        
        # Count detections
        total_detections = await deteksi.count_documents({})
        completed_detections = await deteksi.count_documents({"status": "completed"})
        processing_detections = await deteksi.count_documents({"status": "processing"})
        failed_detections = await deteksi.count_documents({"status": "failed"})
        
        # Count calculations
        total_calculations = await perhitungan.count_documents({})
        
        return {
            "status": "success",
            "data": {
                "users": {
                    "total": total_users,
                    "admin": admin_count,
                    "surveyor": surveyor_count,
                    "user": user_count,
                    "active": active_users
                },
                "detections": {
                    "total": total_detections,
                    "completed": completed_detections,
                    "processing": processing_detections,
                    "failed": failed_detections
                },
                "calculations": {
                    "total": total_calculations
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.get("/users")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    role: Optional[str] = None,
    isActive: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all users with pagination and filtering"""
    try:
        users = get_collection("users")
        
        # Build query
        query = {}
        
        if role:
            query["role"] = role
        
        if isActive is not None:
            query["isActive"] = isActive == "true"
        
        if search:
            query["$or"] = [
                {"namaUser": {"$regex": search, "$options": "i"}},
                {"emailUser": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total = await users.count_documents(query)
        
        # Get users with pagination
        cursor = users.find(query, {"passwordUser": 0}).sort("createdAt", -1).skip((page - 1) * limit).limit(limit)
        user_list = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for user in user_list:
            user["id"] = str(user["_id"])
            del user["_id"]
        
        return {
            "status": "success",
            "data": {
                "users": user_list,
                "pagination": {
                    "currentPage": page,
                    "totalPages": (total + limit - 1) // limit,
                    "totalUsers": total,
                    "limit": limit
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Get all users error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get single user by ID"""
    try:
        users = get_collection("users")
        
        user = await users.find_one({"_id": ObjectId(user_id)}, {"passwordUser": 0})
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail={"status": "error", "message": "User tidak ditemukan"}
            )
        
        user["id"] = str(user["_id"])
        del user["_id"]
        
        return {
            "status": "success",
            "data": {"user": user}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/users")
async def create_user(request: UserCreate, admin: dict = Depends(get_admin_user)):
    """Create a new user (admin only)"""
    try:
        users = get_collection("users")
        
        # Check if email exists
        existing = await users.find_one({"emailUser": request.emailUser.lower()})
        if existing:
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Email sudah terdaftar"}
            )
        
        # Create user
        user_data = {
            "namaUser": request.namaUser,
            "emailUser": request.emailUser.lower(),
            "passwordUser": hash_password(request.passwordUser),
            "role": request.role,
            "isActive": request.isActive,
            "phoneNumber": request.phoneNumber,
            "profileImage": request.profileImage,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await users.insert_one(user_data)
        
        logger.info(f"Admin created new user: {request.emailUser}")
        
        return {
            "status": "success",
            "message": "User berhasil dibuat",
            "data": {
                "id": str(result.inserted_id),
                "namaUser": request.namaUser,
                "emailUser": request.emailUser,
                "role": request.role
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create user error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.post("/users/check-email")
async def check_email_availability(email: str, admin: dict = Depends(get_admin_user)):
    """Check if email is available"""
    users = get_collection("users")
    existing = await users.find_one({"emailUser": email.lower()})
    
    return {
        "status": "success",
        "data": {"available": existing is None}
    }


@router.put("/users/{user_id}")
async def update_user(user_id: str, request: UserUpdate, admin: dict = Depends(get_admin_user)):
    """Update user"""
    try:
        users = get_collection("users")
        
        # Check if user exists
        existing = await users.find_one({"_id": ObjectId(user_id)})
        if not existing:
            raise HTTPException(
                status_code=404,
                detail={"status": "error", "message": "User tidak ditemukan"}
            )
        
        # Build update data
        update_data = {"updatedAt": datetime.utcnow()}
        
        if request.namaUser is not None:
            update_data["namaUser"] = request.namaUser
        if request.emailUser is not None:
            update_data["emailUser"] = request.emailUser.lower()
        if request.role is not None:
            update_data["role"] = request.role
        if request.isActive is not None:
            update_data["isActive"] = request.isActive
        if request.phoneNumber is not None:
            update_data["phoneNumber"] = request.phoneNumber
        if request.profileImage is not None:
            update_data["profileImage"] = request.profileImage
        
        await users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        logger.info(f"Admin updated user: {user_id}")
        
        return {
            "status": "success",
            "message": "User berhasil diupdate"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete user"""
    try:
        users = get_collection("users")
        
        # Check if user exists
        existing = await users.find_one({"_id": ObjectId(user_id)})
        if not existing:
            raise HTTPException(
                status_code=404,
                detail={"status": "error", "message": "User tidak ditemukan"}
            )
        
        # Prevent self-deletion
        if user_id == admin["_id"]:
            raise HTTPException(
                status_code=400,
                detail={"status": "error", "message": "Tidak dapat menghapus akun sendiri"}
            )
        
        await users.delete_one({"_id": ObjectId(user_id)})
        
        logger.info(f"Admin deleted user: {user_id}")
        
        return {
            "status": "success",
            "message": "User berhasil dihapus"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.patch("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, admin: dict = Depends(get_admin_user)):
    """Toggle user active status"""
    try:
        users = get_collection("users")
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=404,
                detail={"status": "error", "message": "User tidak ditemukan"}
            )
        
        new_status = not user.get("isActive", True)
        
        await users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"isActive": new_status, "updatedAt": datetime.utcnow()}}
        )
        
        logger.info(f"Admin toggled user status: {user_id} -> {new_status}")
        
        return {
            "status": "success",
            "message": f"Status user berhasil diubah ke {'aktif' if new_status else 'nonaktif'}",
            "data": {"isActive": new_status}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle user status error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})


@router.put("/users/{user_id}/reset-password")
async def reset_password(user_id: str, new_password: str, admin: dict = Depends(get_admin_user)):
    """Reset user password (admin only)"""
    try:
        users = get_collection("users")
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=404,
                detail={"status": "error", "message": "User tidak ditemukan"}
            )
        
        await users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "passwordUser": hash_password(new_password),
                "updatedAt": datetime.utcnow()
            }}
        )
        
        logger.info(f"Admin reset password for user: {user_id}")
        
        return {
            "status": "success",
            "message": "Password berhasil direset"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(status_code=500, detail={"status": "error", "message": str(e)})
