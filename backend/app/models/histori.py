"""
Histori Model - Pydantic schemas for Activity History
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class HistoriBase(BaseModel):
    actionType: str = Field(..., pattern="^(UPLOAD|PROCESSING|COMPLETED|FAILED|DELETED|VIEWED)$")
    description: str


class HistoriCreate(HistoriBase):
    idUser: str
    relatedVideo: Optional[str] = None
    relatedPerhitungan: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None


class HistoriInDB(HistoriBase):
    id: str = Field(alias="_id")
    idUser: str
    tanggal: datetime = Field(default_factory=datetime.utcnow)
    relatedVideo: Optional[str] = None
    relatedPerhitungan: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class HistoriResponse(BaseModel):
    id: str
    idUser: str
    actionType: str
    description: str
    tanggal: datetime
    relatedVideo: Optional[str] = None
    relatedPerhitungan: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        populate_by_name = True


class HistoriListResponse(BaseModel):
    success: bool = True
    data: List[HistoriResponse]
    pagination: Optional[dict] = None
