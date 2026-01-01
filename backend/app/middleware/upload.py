"""
File Upload Handling
"""

import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from app.utils.logger import logger
from app.config.constants import MAX_VIDEO_SIZE, ALLOWED_VIDEO_TYPES

UPLOAD_DIR = "/tmp/uploads"


async def save_upload_file(file: UploadFile) -> str:
    """Save uploaded file to temporary directory"""
    
    # Create upload directory if not exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_VIDEO_TYPES:
        # Check by extension as fallback
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_extensions = ['.mp4', '.avi', '.mov', '.mkv']
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "message": "Format video tidak didukung. Gunakan MP4, AVI, MOV, atau MKV."
                }
            )
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"video-{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    total_size = 0
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # 1MB chunks
                total_size += len(content)
                
                # Check size limit
                if total_size > MAX_VIDEO_SIZE:
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "success": False,
                            "message": f"Video size exceeds limit. Max: {MAX_VIDEO_SIZE / 1024 / 1024 / 1024:.1f}GB"
                        }
                    )
                
                await out_file.write(content)
        
        logger.info(f"📹 Video saved: {unique_filename} ({total_size} bytes)")
        
        return file_path
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to save upload: {str(e)}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": "Failed to save uploaded file"}
        )


async def delete_file(file_path: str):
    """Delete a file safely"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"🗑️ File deleted: {file_path}")
            return True
    except Exception as e:
        logger.error(f"❌ Failed to delete file: {str(e)}")
    return False


def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except:
        return 0
