"""
DeteksiYOLO Model - Pydantic schemas for YOLO Detection
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CountingLane(BaseModel):
    total: int = 0
    mobil: int = 0
    bus: int = 0
    truk: int = 0


class CountingData(BaseModel):
    totalCounted: int = 0
    laneKiri: CountingLane = Field(default_factory=CountingLane)
    laneKanan: CountingLane = Field(default_factory=CountingLane)
    linePosition: int = 300
    countedVehicleIds: List[int] = Field(default_factory=list)


class ProcessingMetrics(BaseModel):
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    downloadTime: Optional[float] = None
    processingTime: Optional[float] = None
    uploadTime: Optional[float] = None


class DeteksiBase(BaseModel):
    videoFileName: Optional[str] = None
    videoSize: Optional[int] = None
    status: str = Field(default="processing", pattern="^(processing|completed|failed)$")


class DeteksiCreate(DeteksiBase):
    userId: str


class DeteksiUpdate(BaseModel):
    status: Optional[str] = None
    endTime: Optional[datetime] = None
    cloudinaryVideoUrl: Optional[str] = None
    cloudinaryVideoId: Optional[str] = None
    resultsCloudinaryUrl: Optional[str] = None
    resultsCloudinaryId: Optional[str] = None
    totalVehicles: Optional[int] = None
    accuracy: Optional[float] = None
    processingTime: Optional[float] = None
    frameCount: Optional[int] = None
    detailResults: Optional[Dict[str, Any]] = None
    countingData: Optional[CountingData] = None
    error: Optional[str] = None


class DeteksiInDB(DeteksiBase):
    id: str = Field(alias="_id")
    userId: str
    videoPath: Optional[str] = None
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    modelVersion: str = "YOLOv8"
    confidence: float = 0.5
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Input video Cloudinary
    inputCloudinaryUrl: Optional[str] = None
    inputCloudinaryId: Optional[str] = None
    
    # Output video Cloudinary
    cloudinaryVideoUrl: Optional[str] = None
    cloudinaryVideoId: Optional[str] = None
    
    # Results JSON Cloudinary
    resultsCloudinaryUrl: Optional[str] = None
    resultsCloudinaryId: Optional[str] = None
    
    # Detection results
    totalVehicles: int = 0
    accuracy: Optional[float] = None
    processingTime: Optional[float] = None
    frameCount: Optional[int] = None
    detailResults: Optional[Dict[str, Any]] = None
    
    # Counting data
    countingData: Optional[CountingData] = None
    
    # Storage info
    storageType: str = "cloudinary"
    localFilesDeleted: bool = False
    
    # Processing metrics
    processingMetrics: Optional[ProcessingMetrics] = None
    
    error: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class DeteksiResponse(BaseModel):
    id: str
    userId: str
    videoFileName: Optional[str] = None
    videoSize: Optional[int] = None
    status: str
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    inputCloudinaryUrl: Optional[str] = None
    cloudinaryVideoUrl: Optional[str] = None
    totalVehicles: int = 0
    accuracy: Optional[float] = None
    processingTime: Optional[float] = None
    frameCount: Optional[int] = None
    countingData: Optional[CountingData] = None
    error: Optional[str] = None
    createdAt: Optional[datetime] = None

    class Config:
        populate_by_name = True


class DeteksiListResponse(BaseModel):
    success: bool = True
    data: List[DeteksiResponse]
    pagination: dict
