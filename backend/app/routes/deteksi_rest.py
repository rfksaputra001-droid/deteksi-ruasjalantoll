"""
Detection Routes - REST API Based (No WebSocket)
Simple polling-based progress tracking for Render + Vercel
"""

import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Query
from fastapi.responses import JSONResponse
from bson import ObjectId

from app.config.database import get_collection
from app.middleware.auth import get_current_user
from app.services.video_detection_rest import video_detection_rest_service
from app.utils.logger import logger

router = APIRouter()


@router.post("/upload-model")
async def upload_custom_model(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload custom YOLO model for detection"""
    try:
        if user.get("role") not in ["admin", "surveyor"]:
            raise HTTPException(
                status_code=403,
                detail={"success": False, "message": "Hanya admin dan surveyor yang dapat mengunggah model"}
            )
        
        if not file.filename.endswith('.pt'):
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "File harus berupa model YOLO (.pt)"}
            )
        
        model_path = f"/tmp/models/custom_{user['_id']}.pt"
        os.makedirs("/tmp/models", exist_ok=True)
        
        content = await file.read()
        with open(model_path, "wb") as f:
            f.write(content)
        
        try:
            from ultralytics import YOLO
            test_model = YOLO(model_path)
            class_names = test_model.names
            logger.info(f"✅ Custom model uploaded: {class_names}")
        except Exception as e:
            os.remove(model_path)
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": f"Model tidak valid: {str(e)}"}
            )
        
        video_detection_rest_service.custom_model_path = model_path
        video_detection_rest_service.model_path = model_path
        video_detection_rest_service.model = None
        
        return {
            "success": True,
            "message": "Model kustom berhasil diunggah",
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
        raise HTTPException(status_code=500, detail={"success": False, "message": str(e)})


@router.get("/model-info")
async def get_model_info(user: dict = Depends(get_current_user)):
    """Get current model information"""
    try:
        model_info = {
            "current_model": video_detection_rest_service.model_path,
            "is_custom": video_detection_rest_service.custom_model_path is not None,
            "model_loaded": video_detection_rest_service.model is not None
        }
        
        if video_detection_rest_service.model:
            try:
                model_info["classes"] = video_detection_rest_service.model.names
                model_info["total_classes"] = len(video_detection_rest_service.model.names)
            except:
                pass
        
        return {"success": True, "data": model_info}
        
    except Exception as e:
        logger.error(f"Get model info error: {str(e)}")
        raise HTTPException(status_code=500, detail={"success": False, "message": str(e)})


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload video for detection - returns tracking_id for polling"""
    try:
        logger.info(f"📤 Upload: {file.filename}, User: {user.get('email')}")
        
        # Validate file
        if file.filename:
            file_ext = file.filename.split('.')[-1].lower()
            allowed = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv']
            
            if not (file.content_type and file.content_type.startswith('video/')) and file_ext not in allowed:
                raise HTTPException(
                    status_code=400,
                    detail={"success": False, "message": f"Format yang didukung: {', '.join(allowed)}"}
                )
        else:
            raise HTTPException(status_code=400, detail={"success": False, "message": "Nama file tidak valid"})
        
        # Check file size (50MB limit)
        content = await file.read()
        file_size = len(content)
        
        if file_size > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": "File terlalu besar (maksimal 50MB)"}
            )
        
        # Generate tracking ID and save file
        tracking_id = str(uuid.uuid4())
        temp_path = f"/tmp/uploads/{tracking_id}_{file.filename}"
        os.makedirs("/tmp/uploads", exist_ok=True)
        
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Start background detection
        await video_detection_rest_service.start_detection(
            tracking_id=tracking_id,
            video_file_path=temp_path,
            user_id=user["_id"],
            filename=file.filename
        )
        
        logger.info(f"✅ Upload successful: {tracking_id}")
        
        return {
            "success": True,
            "message": "Video berhasil diunggah dan sedang diproses",
            "data": {
                "tracking_id": tracking_id,
                "filename": file.filename,
                "status": "processing",
                "poll_url": f"/api/deteksi/status/{tracking_id}"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail={"success": False, "message": str(e)})


@router.get("/status/{tracking_id}")
async def get_detection_status(
    tracking_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get detection status - POLLING ENDPOINT
    Client should poll this every 2 seconds during processing
    """
    try:
        # First check in-memory processing status
        status = video_detection_rest_service.get_processing_status(tracking_id)
        
        if status:
            return {
                "success": True,
                "data": {
                    "tracking_id": tracking_id,
                    **status
                }
            }
        
        # If not in memory, check database for completed results
        deteksi = get_collection("deteksi")
        result = await deteksi.find_one({"_id": tracking_id})
        
        if result:
            return {
                "success": True,
                "data": {
                    "tracking_id": tracking_id,
                    "status": result.get("status", "completed"),
                    "progress": 100,
                    "message": "Deteksi selesai",
                    "result": {
                        "filename": result.get("filename"),
                        "video_info": result.get("videoInfo"),
                        "vehicle_counts": result.get("detectionResults", {}).get("vehicleCounts"),
                        "total_detections": result.get("detectionResults", {}).get("totalDetections"),
                        "processed_video_url": result.get("processedVideoUrl"),
                        "counting_data": result.get("countingData"),
                        "created_at": result.get("createdAt")
                    }
                }
            }
        
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": "Tracking ID tidak ditemukan"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail={"success": False, "message": str(e)})


@router.get("/list")
async def get_detection_list(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user)
):
    """Get user's detection history"""
    try:
        deteksi = get_collection("deteksi")
        query = {"userId": user["_id"]}
        
        total = await deteksi.count_documents(query)
        cursor = deteksi.find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit)
        detection_list = await cursor.to_list(length=limit)
        
        for detection in detection_list:
            detection["id"] = str(detection["_id"])
            del detection["_id"]
            detection["userId"] = str(detection.get("userId", ""))
        
        return {
            "success": True,
            "data": detection_list,
            "pagination": {
                "currentPage": page,
                "totalPages": (total + limit - 1) // limit,
                "totalItems": total,
                "itemsPerPage": limit
            }
        }
        
    except Exception as e:
        logger.error(f"List error: {str(e)}")
        raise HTTPException(status_code=500, detail={"success": False, "message": str(e)})


@router.get("/detail/{detection_id}")
async def get_detection_detail(
    detection_id: str,
    user: dict = Depends(get_current_user)
):
    """Get detection detail"""
    try:
        deteksi = get_collection("deteksi")
        detection = await deteksi.find_one({"_id": detection_id})
        
        if not detection:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Deteksi tidak ditemukan"}
            )
        
        detection["id"] = str(detection["_id"])
        del detection["_id"]
        detection["userId"] = str(detection.get("userId", ""))
        
        return {"success": True, "data": detection}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detail error: {str(e)}")
        raise HTTPException(status_code=500, detail={"success": False, "message": str(e)})


@router.delete("/{detection_id}")
async def delete_detection(
    detection_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a detection"""
    try:
        deteksi = get_collection("deteksi")
        
        # Find and verify ownership
        detection = await deteksi.find_one({"_id": detection_id})
        
        if not detection:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Deteksi tidak ditemukan"}
            )
        
        # Check ownership (admin can delete any)
        if str(detection.get("userId")) != str(user["_id"]) and user.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail={"success": False, "message": "Tidak memiliki izin untuk menghapus deteksi ini"}
            )
        
        await deteksi.delete_one({"_id": detection_id})
        
        return {
            "success": True,
            "message": "Deteksi berhasil dihapus"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail={"success": False, "message": str(e)})
