"""
Detection Routes - Complete Video Processing with Real-time Progress
"""

import os
import uuid
import tempfile
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Query
from fastapi.responses import JSONResponse
from bson import ObjectId

from app.config.database import get_collection
from app.middleware.auth import get_current_user
from app.services.video_detection import video_detection_service
from app.utils.logger import logger

router = APIRouter()


@router.post("/upload-model")
async def upload_custom_model(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload custom YOLO model for detection"""
    try:
        # Only allow admin or surveyor to upload models
        if user.get("role") not in ["admin", "surveyor"]:
            raise HTTPException(
                status_code=403,
                detail={"success": False, "message": "Hanya admin dan surveyor yang dapat mengunggah model"}
            )
        
        # Validate file
        if not file.filename.endswith('.pt'):
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "File harus berupa model YOLO (.pt)"}
            )
        
        # Save custom model
        model_path = f"/tmp/models/custom_{user['_id']}.pt"
        os.makedirs("/tmp/models", exist_ok=True)
        
        content = await file.read()
        with open(model_path, "wb") as f:
            f.write(content)
        
        # Test model loading
        try:
            from ultralytics import YOLO
            test_model = YOLO(model_path)
            class_names = test_model.names
            logger.info(f"✅ Custom model uploaded successfully: {class_names}")
        except Exception as e:
            os.remove(model_path)
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": f"Model tidak valid: {str(e)}"}
            )
        
        # Update video detection service to use new model
        video_detection_service.custom_model_path = model_path
        video_detection_service.model_path = model_path
        video_detection_service.model = None  # Force reload
        
        logger.info(f"🎯 Custom model uploaded by {user.get('email', 'unknown')}: {file.filename}")
        
        return {
            "success": True,
            "message": "Model kustom berhasil diunggah dan akan digunakan untuk deteksi selanjutnya",
            "data": {
                "filename": file.filename,
                "classes": class_names,
                "total_classes": len(class_names)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload model error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": f"Gagal mengunggah model: {str(e)}"}
        )


@router.get("/model-info")
async def get_model_info(user: dict = Depends(get_current_user)):
    """Get current model information"""
    try:
        model_info = {
            "current_model": video_detection_service.model_path,
            "is_custom": video_detection_service.custom_model_path is not None,
            "model_loaded": video_detection_service.model is not None
        }
        
        if video_detection_service.model:
            try:
                model_info["classes"] = video_detection_service.model.names
                model_info["total_classes"] = len(video_detection_service.model.names)
            except:
                model_info["classes"] = "Unable to read class names"
        
        return {
            "success": True,
            "data": model_info
        }
        
    except Exception as e:
        logger.error(f"Get model info error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload video for detection processing"""
    try:
        logger.info(f"📤 Upload request - File: {file.filename}, Content-Type: {file.content_type}, User: {user.get('email', 'unknown')}")
        
        # Validate file extension and content type
        if file.filename:
            file_ext = file.filename.split('.')[-1].lower()
            allowed_extensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv']
            
            # Check by extension or content type
            if not (file.content_type and file.content_type.startswith('video/')) and file_ext not in allowed_extensions:
                logger.warning(f"❌ Invalid file type: {file.content_type}, extension: {file_ext}")
                raise HTTPException(
                    status_code=400,
                    detail={"success": False, "message": f"File harus berupa video. Format yang didukung: {', '.join(allowed_extensions)}"}
                )
        else:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "Nama file tidak valid"}
            )
        
        # Check file size (50MB limit for free tier)
        content = await file.read()
        file_size = len(content)
        
        if file_size > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "File terlalu besar (maksimal 50MB)"}
            )
        
        # Generate tracking ID
        tracking_id = str(uuid.uuid4())
        
        # Save file temporarily
        temp_path = f"/tmp/uploads/{tracking_id}_{file.filename}"
        os.makedirs("/tmp/uploads", exist_ok=True)
        
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Start background detection
        await video_detection_service.start_detection(
            tracking_id=tracking_id,
            video_file_path=temp_path,
            user_id=user["_id"],
            filename=file.filename
        )
        
        logger.info(f"✅ Video upload successful: {tracking_id}")
        
        return {
            "success": True,
            "message": "Video berhasil diunggah dan sedang diproses",
            "data": {
                "tracking_id": tracking_id,
                "filename": file.filename,
                "status": "processing"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": f"Gagal mengunggah video: {str(e)}"}
        )


@router.get("/status/{tracking_id}")
async def get_detection_status(
    tracking_id: str,
    user: dict = Depends(get_current_user)
):
    """Get detection processing status"""
    try:
        # Check processing status
        status = video_detection_service.get_processing_status(tracking_id)
        
        if status is None:
            # Check database for completed results
            deteksi = get_collection("deteksi")
            result = await deteksi.find_one({"_id": tracking_id})
            
            if result:
                return {
                    "success": True,
                    "data": {
                        "tracking_id": tracking_id,
                        "status": result.get("status", "completed"),
                        "results": {
                            "filename": result.get("filename"),
                            "video_info": result.get("videoInfo"),
                            "detection_results": result.get("detectionResults"),
                            "processed_video_url": result.get("processedVideoUrl"),
                            "created_at": result.get("createdAt")
                        }
                    }
                }
            else:
                raise HTTPException(
                    status_code=404,
                    detail={"success": False, "message": "Tracking ID tidak ditemukan"}
                )
        
        return {
            "success": True,
            "data": {
                "tracking_id": tracking_id,
                "status": status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/list")
async def get_detection_list(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user)
):
    """Get user's detection history"""
    try:
        deteksi = get_collection("deteksi")
        
        # Build query
        query = {"userId": user["_id"]}
        
        # Get total count
        total = await deteksi.count_documents(query)
        
        # Get detections with pagination
        cursor = deteksi.find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit)
        detection_list = await cursor.to_list(length=limit)
        
        # Convert ObjectIds and format response
        for detection in detection_list:
            detection["id"] = str(detection["_id"])
            del detection["_id"]
            detection["userId"] = str(detection.get("userId", ""))
        
        return {
            "success": True,
            "data": detection_list,
            "pagination": {
                "current_page": page,
                "total_pages": (total + limit - 1) // limit,
                "total_items": total,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Detection list error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/result/{tracking_id}")
async def get_detection_result(
    tracking_id: str,
    user: dict = Depends(get_current_user)
):
    """Get detailed detection results"""
    try:
        deteksi = get_collection("deteksi")
        result = await deteksi.find_one({"_id": tracking_id, "userId": user["_id"]})
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Hasil deteksi tidak ditemukan"}
            )
        
        # Format response
        result["id"] = str(result["_id"])
        del result["_id"]
        result["userId"] = str(result.get("userId", ""))
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get result error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.delete("/{tracking_id}")
async def delete_detection(
    tracking_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete detection record"""
    try:
        deteksi = get_collection("deteksi")
        result = await deteksi.delete_one({"_id": tracking_id, "userId": user["_id"]})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Data deteksi tidak ditemukan"}
            )
        
        return {
            "success": True,
            "message": "Data deteksi berhasil dihapus"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete detection error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )