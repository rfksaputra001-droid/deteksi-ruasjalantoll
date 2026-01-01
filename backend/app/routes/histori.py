"""
Histori Routes - Activity History API
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from app.config.database import get_collection
from app.middleware.auth import get_current_user
from app.utils.logger import logger

router = APIRouter()


@router.get("/")
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    actionType: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get user's activity history"""
    try:
        histori = get_collection("histori")
        
        # Build query
        query = {"idUser": ObjectId(user["_id"])}
        
        if actionType:
            query["actionType"] = actionType
        
        # Get total count
        total = await histori.count_documents(query)
        
        # Get history with pagination
        cursor = histori.find(query).sort("tanggal", -1).skip((page - 1) * limit).limit(limit)
        history_list = await cursor.to_list(length=limit)
        
        # Convert ObjectIds
        for hist in history_list:
            hist["id"] = str(hist["_id"])
            del hist["_id"]
            hist["idUser"] = str(hist.get("idUser", ""))
            if hist.get("relatedVideo"):
                hist["relatedVideo"] = str(hist["relatedVideo"])
            if hist.get("relatedPerhitungan"):
                hist["relatedPerhitungan"] = str(hist["relatedPerhitungan"])
        
        return {
            "success": True,
            "data": history_list,
            "pagination": {
                "currentPage": page,
                "totalPages": (total + limit - 1) // limit,
                "totalItems": total,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Get history error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/summary")
async def get_activity_summary(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user)
):
    """Get user's activity summary"""
    try:
        histori = get_collection("histori")
        
        # Calculate start date
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Aggregate activities by type
        pipeline = [
            {
                "$match": {
                    "idUser": ObjectId(user["_id"]),
                    "tanggal": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$actionType",
                    "count": {"$sum": 1},
                    "lastActivity": {"$max": "$tanggal"}
                }
            }
        ]
        
        cursor = histori.aggregate(pipeline)
        activities = await cursor.to_list(length=100)
        
        # Format result
        summary = {}
        for activity in activities:
            summary[activity["_id"]] = {
                "count": activity["count"],
                "lastActivity": activity["lastActivity"]
            }
        
        return {
            "success": True,
            "data": {
                "days": days,
                "summary": summary
            }
        }
        
    except Exception as e:
        logger.error(f"Get activity summary error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


async def create_history_log(
    user_id: str,
    action_type: str,
    description: str,
    video_id: str = None,
    perhitungan_id: str = None,
    metadata: dict = None,
    ip_address: str = None,
    user_agent: str = None
):
    """Helper function to create history log"""
    try:
        histori = get_collection("histori")
        
        log_data = {
            "idUser": ObjectId(user_id),
            "actionType": action_type,
            "description": description,
            "tanggal": datetime.utcnow(),
            "metadata": metadata or {},
            "createdAt": datetime.utcnow()
        }
        
        if video_id:
            log_data["relatedVideo"] = ObjectId(video_id)
        if perhitungan_id:
            log_data["relatedPerhitungan"] = ObjectId(perhitungan_id)
        if ip_address:
            log_data["ipAddress"] = ip_address
        if user_agent:
            log_data["userAgent"] = user_agent
        
        await histori.insert_one(log_data)
        
    except Exception as e:
        logger.error(f"Create history log error: {str(e)}")
