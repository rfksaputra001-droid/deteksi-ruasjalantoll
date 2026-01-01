"""
Cloudinary Configuration
"""

import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.utils.logger import logger


def configure_cloudinary():
    """Configure Cloudinary with environment variables"""
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET")
    )


async def test_cloudinary_connection():
    """Test Cloudinary connection"""
    try:
        configure_cloudinary()
        cloudinary.api.ping()
        logger.info("✅ Cloudinary connected successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Cloudinary connection failed: {str(e)}")
        return False


async def upload_video(file_path: str, folder: str = None, public_id: str = None):
    """Upload video to Cloudinary"""
    configure_cloudinary()
    
    folder = folder or f"{os.getenv('CLOUDINARY_FOLDER', 'yolo-deteksi')}/videos"
    
    try:
        result = cloudinary.uploader.upload(
            file_path,
            resource_type="video",
            folder=folder,
            public_id=public_id,
            overwrite=True,
            timeout=900000,
            chunk_size=20000000
        )
        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id")
        }
    except Exception as e:
        logger.error(f"❌ Cloudinary video upload failed: {str(e)}")
        raise


async def upload_file(file_path: str, folder: str = None, public_id: str = None, resource_type: str = "auto"):
    """Upload file to Cloudinary"""
    configure_cloudinary()
    
    folder = folder or os.getenv('CLOUDINARY_FOLDER', 'yolo-deteksi')
    
    try:
        result = cloudinary.uploader.upload(
            file_path,
            resource_type=resource_type,
            folder=folder,
            public_id=public_id,
            overwrite=True
        )
        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id")
        }
    except Exception as e:
        logger.error(f"❌ Cloudinary upload failed: {str(e)}")
        raise


async def delete_resource(public_id: str, resource_type: str = "video"):
    """Delete resource from Cloudinary"""
    configure_cloudinary()
    
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"❌ Cloudinary delete failed: {str(e)}")
        return False
