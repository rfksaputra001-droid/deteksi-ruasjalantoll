"""
Dashboard Routes - Statistics API
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from app.config.database import get_collection
from app.middleware.auth import get_current_user
from app.utils.logger import logger

router = APIRouter()


@router.get("/")
async def get_dashboard_stats(
    date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get dashboard statistics with optional date filter"""
    try:
        perhitungan = get_collection("perhitungan")
        deteksi = get_collection("deteksi")
        
        # Get all perhitungan
        perhitungan_list = await perhitungan.find({}).sort("createdAt", -1).to_list(length=1000)
        
        # Get all completed deteksi
        deteksi_list = await deteksi.find({"status": "completed"}).to_list(length=1000)
        
        # Filter by date if provided
        filtered_perhitungan = perhitungan_list
        if date:
            target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            target_date = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            next_day = target_date + timedelta(days=1)
            
            filtered_perhitungan = [
                item for item in perhitungan_list
                if target_date <= item.get("createdAt", datetime.min) < next_day
            ]
        
        # Calculate total traffic counter
        total_traffic_counter = 0
        for det in deteksi_list:
            counting_data = det.get("countingData", {})
            if counting_data:
                lane_kiri = counting_data.get("laneKiri", {})
                lane_kanan = counting_data.get("laneKanan", {})
                total_traffic_counter += (
                    lane_kiri.get("mobil", 0) + lane_kiri.get("bus", 0) + lane_kiri.get("truk", 0) +
                    lane_kanan.get("mobil", 0) + lane_kanan.get("bus", 0) + lane_kanan.get("truk", 0)
                )
        
        # Calculate LOS distribution
        los_distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0}
        highest_los = None
        highest_los_location = None
        highest_los_time = None
        
        # Get today's data for highest LOS
        today = datetime.fromisoformat(date.replace('Z', '+00:00')) if date else datetime.utcnow()
        today = today.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today + timedelta(days=1)
        
        today_perhitungan = [
            item for item in filtered_perhitungan
            if today <= item.get("createdAt", datetime.min) < today_end
        ]
        
        # Count LOS distribution from all data
        for item in perhitungan_list:
            los = item.get("LOS", "").upper()
            if los in los_distribution:
                los_distribution[los] += 1
        
        # Find highest LOS from today
        los_order = ['A', 'B', 'C', 'D', 'E', 'F']
        for item in today_perhitungan:
            los = item.get("LOS", "").upper()
            if los:
                if not highest_los or los_order.index(los) > los_order.index(highest_los):
                    highest_los = los
                    metrics = item.get("metrics", {})
                    highest_los_location = metrics.get("namaRuas", "Unknown")
                    highest_los_time = metrics.get("waktuObservasi") or item.get("createdAt", datetime.utcnow()).strftime("%H:%M")
        
        # Calculate percentages
        total_los = sum(los_distribution.values())
        los_percentages = {}
        for los, count in los_distribution.items():
            los_percentages[los] = round((count / total_los * 100), 1) if total_los > 0 else 0
        
        # Get traffic data for chart
        traffic_data = []
        for item in filtered_perhitungan[:50]:  # Limit to 50 items
            metrics = item.get("metrics", {})
            traffic_data.append({
                "date": item.get("createdAt"),
                "namaRuas": metrics.get("namaRuas", ""),
                "LOS": item.get("LOS", ""),
                "DJ": item.get("DJ", 0),
                "totalKendaraan": item.get("totalKendaraan", 0),
                "waktuObservasi": metrics.get("waktuObservasi", "")
            })
        
        return {
            "success": True,
            "data": {
                "totalTrafficCounter": total_traffic_counter,
                "losDistribution": los_distribution,
                "losPercentages": los_percentages,
                "highestLOS": {
                    "los": highest_los,
                    "location": highest_los_location,
                    "time": highest_los_time
                },
                "trafficData": traffic_data,
                "totalPerhitungan": len(perhitungan_list),
                "totalDeteksi": len(deteksi_list),
                "todayPerhitungan": len(today_perhitungan)
            }
        }
        
    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/chart-data")
async def get_chart_data(
    days: int = Query(7, ge=1, le=30),
    user: dict = Depends(get_current_user)
):
    """Get chart data for the last N days"""
    try:
        perhitungan = get_collection("perhitungan")
        
        # Calculate start date
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get data
        data = await perhitungan.find(
            {"createdAt": {"$gte": start_date}}
        ).sort("createdAt", 1).to_list(length=1000)
        
        # Group by date
        chart_data = {}
        for item in data:
            date_key = item.get("createdAt", datetime.utcnow()).strftime("%Y-%m-%d")
            if date_key not in chart_data:
                chart_data[date_key] = {
                    "date": date_key,
                    "count": 0,
                    "totalKendaraan": 0,
                    "los": {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0}
                }
            
            chart_data[date_key]["count"] += 1
            chart_data[date_key]["totalKendaraan"] += item.get("totalKendaraan", 0)
            
            los = item.get("LOS", "").upper()
            if los in chart_data[date_key]["los"]:
                chart_data[date_key]["los"][los] += 1
        
        return {
            "success": True,
            "data": list(chart_data.values())
        }
        
    except Exception as e:
        logger.error(f"Get chart data error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )
