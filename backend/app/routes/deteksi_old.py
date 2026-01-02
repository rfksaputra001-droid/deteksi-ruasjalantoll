"""
Detection Routes - YOLO Video Processing API
"""

import os
import shutil
import asyncio
import httpx
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from bson import ObjectId
from app.config.database import get_collection
from app.config import cloudinary as cloudinary_service
from app.middleware.auth import get_surveyor_or_admin
from app.middleware.upload import save_upload_file, delete_file, get_file_size
from app.services.yolo_detector import get_detector
from app.core.socket import socket_manager
from app.utils.logger import logger

router = APIRouter()

TEMP_DIR = "/tmp/temp"


async def emit_progress(tracking_id: str, data: dict):
    """Emit progress update via Socket.IO"""
    try:
        await socket_manager.emit_progress(tracking_id, data)
    except Exception as e:
        logger.warning(f"Failed to emit progress: {str(e)}")


async def process_video_task(
    tracking_id: str,
    input_cloudinary_url: str,
    input_cloudinary_id: str,
    user_id: str,
    video_filename: str,
    video_size: int
):
    """Background task for video processing"""
    deteksi = get_collection("deteksi")
    temp_dir = os.path.join(TEMP_DIR, str(tracking_id))
    
    try:
        os.makedirs(temp_dir, exist_ok=True)
        
        # Download video from Cloudinary
        await emit_progress(tracking_id, {
            'stage': 'downloading',
            'progress': 20,
            'message': 'Mengunduh video dari Cloudinary...'
        })
        
        temp_video_path = os.path.join(temp_dir, 'input.mp4')
        output_video_path = os.path.join(temp_dir, 'output.mp4')
        results_json_path = os.path.join(temp_dir, 'results.json')
        
        # Download video
        async with httpx.AsyncClient() as client:
            response = await client.get(input_cloudinary_url, timeout=300.0)
            response.raise_for_status()
            
            with open(temp_video_path, 'wb') as f:
                f.write(response.content)
        
        logger.info(f"✅ Video downloaded: {temp_video_path}")
        
        # Process with YOLO
        await emit_progress(tracking_id, {
            'stage': 'processing',
            'progress': 25,
            'message': 'Memulai deteksi YOLO...'
        })
        
        detector = get_detector()
        
        async def progress_callback(data):
            await emit_progress(tracking_id, data)
        
        results = await detector.process_video(
            temp_video_path,
            output_video_path,
            results_json_path,
            progress_callback
        )
        
        # Upload output video to Cloudinary
        await emit_progress(tracking_id, {
            'stage': 'uploading_output',
            'progress': 88,
            'message': 'Mengupload video hasil ke Cloudinary...'
        })
        
        output_upload = await cloudinary_service.upload_video(
            output_video_path,
            folder=f"{os.getenv('CLOUDINARY_FOLDER', 'yolo-deteksi')}/output-videos",
            public_id=f"output-{tracking_id}"
        )
        
        # Upload results JSON to Cloudinary
        results_upload = await cloudinary_service.upload_file(
            results_json_path,
            folder=f"{os.getenv('CLOUDINARY_FOLDER', 'yolo-deteksi')}/results",
            public_id=f"results-{tracking_id}",
            resource_type="raw"
        )
        
        # Save to database
        await emit_progress(tracking_id, {
            'stage': 'saving',
            'progress': 95,
            'message': 'Menyimpan hasil ke database...'
        })
        
        end_time = datetime.utcnow()
        counting_data = results.get('counting_data', {})
        
        deteksi_record = {
            "_id": ObjectId(tracking_id),
            "userId": ObjectId(user_id),
            "videoFileName": video_filename,
            "videoSize": video_size,
            "status": "completed",
            "startTime": datetime.utcnow(),
            "endTime": end_time,
            "inputCloudinaryUrl": input_cloudinary_url,
            "inputCloudinaryId": input_cloudinary_id,
            "cloudinaryVideoUrl": output_upload['url'],
            "cloudinaryVideoId": output_upload['public_id'],
            "resultsCloudinaryUrl": results_upload['url'],
            "resultsCloudinaryId": results_upload['public_id'],
            "totalVehicles": results.get('total_vehicles', 0),
            "accuracy": results.get('accuracy', 90.0),
            "processingTime": results.get('processing_time', 0),
            "frameCount": results.get('frame_count', 0),
            "detailResults": results,
            "storageType": "cloudinary",
            "localFilesDeleted": True,
            "countingData": {
                "totalCounted": counting_data.get('total_counted', 0),
                "laneKiri": counting_data.get('lane_kiri', {}),
                "laneKanan": counting_data.get('lane_kanan', {}),
                "linePosition": counting_data.get('line_position', 300),
                "countedVehicleIds": counting_data.get('counted_vehicle_ids', [])
            },
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        await deteksi.insert_one(deteksi_record)
        
        logger.info(f"✅ Detection saved to database: {tracking_id}")
        
        # Emit completion
        await emit_progress(tracking_id, {
            'stage': 'completed',
            'progress': 100,
            'message': 'Deteksi selesai!',
            'detectionId': str(tracking_id),
            'outputVideoUrl': output_upload['url'],
            'totalVehicles': results.get('total_vehicles', 0),
            'accuracy': results.get('accuracy', 90.0),
            'processingTime': results.get('processing_time', 0),
            'countingData': counting_data
        })
        
    except Exception as e:
        logger.error(f"❌ Processing error: {str(e)}")
        
        # Save failed record
        await deteksi.update_one(
            {"_id": ObjectId(tracking_id)},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "endTime": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }},
            upsert=True
        )
        
        await emit_progress(tracking_id, {
            'stage': 'error',
            'progress': 0,
            'message': f'Deteksi gagal: {str(e)}',
            'detectionId': str(tracking_id)
        })
    
    finally:
        # Cleanup temp directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            logger.info(f"🗑️ Temp directory cleaned: {temp_dir}")


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    user: dict = Depends(get_surveyor_or_admin)
):
    """Upload video for YOLO detection"""
    tracking_id = str(ObjectId())
    
    try:
        # Save uploaded file
        await emit_progress(tracking_id, {
            'stage': 'uploading',
            'progress': 0,
            'message': 'Menyimpan video...'
        })
        
        video_path = await save_upload_file(video)
        video_size = get_file_size(video_path)
        original_filename = video.filename
        
        logger.info(f"📹 Video uploaded: {original_filename} ({video_size} bytes)")
        
        # Upload to Cloudinary first
        await emit_progress(tracking_id, {
            'stage': 'uploading_input',
            'progress': 5,
            'message': 'Upload video input ke Cloudinary...'
        })
        
        try:
            input_upload = await cloudinary_service.upload_video(
                video_path,
                folder=f"{os.getenv('CLOUDINARY_FOLDER', 'yolo-deteksi')}/input-videos",
                public_id=f"input-{tracking_id}"
            )
            
            input_cloudinary_url = input_upload['url']
            input_cloudinary_id = input_upload['public_id']
            
            logger.info(f"✅ Input video uploaded to Cloudinary: {input_cloudinary_url}")
            
            # Delete local input file
            await delete_file(video_path)
            
        except Exception as upload_error:
            logger.error(f"❌ Failed to upload to Cloudinary: {str(upload_error)}")
            await delete_file(video_path)
            raise HTTPException(
                status_code=500,
                detail={"success": False, "message": "Failed to upload video to cloud storage"}
            )
        
        # Start background processing
        background_tasks.add_task(
            process_video_task,
            tracking_id,
            input_cloudinary_url,
            input_cloudinary_id,
            user["_id"],
            original_filename,
            video_size
        )
        
        return {
            "success": True,
            "message": "Video upload dimulai. Silahkan pantau progress...",
            "data": {
                "trackingId": tracking_id,
                "status": "processing"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        await emit_progress(tracking_id, {
            'stage': 'error',
            'progress': 0,
            'message': f'Error: {str(e)}'
        })
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/result/{detection_id}")
async def get_detection_result(detection_id: str, user: dict = Depends(get_surveyor_or_admin)):
    """Get detection result by ID"""
    try:
        deteksi = get_collection("deteksi")
        
        result = await deteksi.find_one({"_id": ObjectId(detection_id)})
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Detection not found"}
            )
        
        # Convert ObjectIds to strings
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


@router.get("/status/{detection_id}")
async def get_detection_status(detection_id: str, user: dict = Depends(get_surveyor_or_admin)):
    """Get detection status"""
    try:
        deteksi = get_collection("deteksi")
        
        result = await deteksi.find_one(
            {"_id": ObjectId(detection_id)},
            {"status": 1, "error": 1, "cloudinaryVideoUrl": 1, "totalVehicles": 1, "countingData": 1}
        )
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Detection not found"}
            )
        
        return {
            "success": True,
            "data": {
                "id": str(result["_id"]),
                "status": result.get("status"),
                "error": result.get("error"),
                "outputVideoUrl": result.get("cloudinaryVideoUrl"),
                "totalVehicles": result.get("totalVehicles", 0),
                "countingData": result.get("countingData")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get status error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/video/{detection_id}")
async def stream_video(detection_id: str, user: dict = Depends(get_surveyor_or_admin)):
    """Stream output video (redirect to Cloudinary URL)"""
    try:
        deteksi = get_collection("deteksi")
        
        result = await deteksi.find_one(
            {"_id": ObjectId(detection_id)},
            {"cloudinaryVideoUrl": 1}
        )
        
        if not result or not result.get("cloudinaryVideoUrl"):
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Video not found"}
            )
        
        # Redirect to Cloudinary URL
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=result["cloudinaryVideoUrl"])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stream video error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.delete("/{detection_id}")
async def delete_detection(detection_id: str, user: dict = Depends(get_surveyor_or_admin)):
    """Delete detection and associated files"""
    try:
        deteksi = get_collection("deteksi")
        
        result = await deteksi.find_one({"_id": ObjectId(detection_id)})
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Detection not found"}
            )
        
        # Delete from Cloudinary
        if result.get("inputCloudinaryId"):
            await cloudinary_service.delete_resource(result["inputCloudinaryId"], "video")
        if result.get("cloudinaryVideoId"):
            await cloudinary_service.delete_resource(result["cloudinaryVideoId"], "video")
        if result.get("resultsCloudinaryId"):
            await cloudinary_service.delete_resource(result["resultsCloudinaryId"], "raw")
        
        # Delete from database
        await deteksi.delete_one({"_id": ObjectId(detection_id)})
        
        logger.info(f"🗑️ Detection deleted: {detection_id}")
        
        return {
            "success": True,
            "message": "Detection deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete detection error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/list")
async def list_detections(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    user: dict = Depends(get_surveyor_or_admin)
):
    """List user's detections with pagination"""
    try:
        deteksi = get_collection("deteksi")
        
        # Build query - filter by user unless admin
        query = {}
        if user.get("role") != "admin":
            query["userId"] = ObjectId(user["_id"])
        
        if status:
            query["status"] = status
        
        # Get total count
        total = await deteksi.count_documents(query)
        
        # Get detections
        cursor = deteksi.find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit)
        detection_list = await cursor.to_list(length=limit)
        
        # Convert ObjectIds
        for det in detection_list:
            det["id"] = str(det["_id"])
            del det["_id"]
            det["userId"] = str(det.get("userId", ""))
        
        return {
            "success": True,
            "data": detection_list,
            "pagination": {
                "currentPage": page,
                "totalPages": (total + limit - 1) // limit,
                "totalItems": total,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"List detections error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/")
async def deteksi_info():
    """Detection API info"""
    return {
        "status": "success",
        "message": "Deteksi API",
        "endpoints": {
            "POST /api/deteksi/upload": "Upload video untuk deteksi",
            "GET /api/deteksi/list": "List detections dengan pagination",
            "GET /api/deteksi/result/:detectionId": "Get detail hasil deteksi",
            "GET /api/deteksi/status/:detectionId": "Get status deteksi",
            "GET /api/deteksi/video/:detectionId": "Stream video hasil deteksi",
            "DELETE /api/deteksi/:detectionId": "Hapus detection dan file terkait"
        }
    }
