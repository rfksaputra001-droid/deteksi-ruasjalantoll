"""
Perhitungan Model - Pydantic schemas for Traffic Calculations
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class PerhitunganMetrics(BaseModel):
    namaRuas: Optional[str] = None
    tipeJalan: Optional[str] = None
    kapasitas: Optional[int] = None
    flowRate: Optional[float] = None
    durasiMenit: Optional[int] = None
    waktuObservasi: Optional[str] = None
    deteksiId: Optional[str] = None
    averageSpeed: Optional[float] = None
    density: Optional[float] = None
    peakHour: Optional[Dict[str, Any]] = None


class PerhitunganBase(BaseModel):
    jumlahMobil: int = Field(default=0, ge=0)
    jumlahMotor: int = Field(default=0, ge=0)
    totalKendaraan: int = Field(default=0, ge=0)
    DJ: float = Field(..., ge=0)
    LOS: str = Field(..., pattern="^[A-F]$")


class PerhitunganCreate(PerhitunganBase):
    userId: str
    idDeteksi: Optional[str] = None
    idVideo: Optional[str] = None
    metrics: Optional[PerhitunganMetrics] = None


class PerhitunganUpdate(BaseModel):
    jumlahMobil: Optional[int] = Field(None, ge=0)
    jumlahMotor: Optional[int] = Field(None, ge=0)
    DJ: Optional[float] = Field(None, ge=0)
    LOS: Optional[str] = Field(None, pattern="^[A-F]$")
    metrics: Optional[PerhitunganMetrics] = None


class PerhitunganInDB(PerhitunganBase):
    id: str = Field(alias="_id")
    userId: str
    idDeteksi: Optional[str] = None
    idVideo: Optional[str] = None
    waktuProses: datetime = Field(default_factory=datetime.utcnow)
    metrics: Optional[PerhitunganMetrics] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class PerhitunganResponse(BaseModel):
    id: str
    userId: str
    idDeteksi: Optional[str] = None
    jumlahMobil: int
    jumlahMotor: int
    totalKendaraan: int
    DJ: float
    LOS: str
    metrics: Optional[PerhitunganMetrics] = None
    createdAt: Optional[datetime] = None

    class Config:
        populate_by_name = True


class ManualCalculationRequest(BaseModel):
    # Data jalan
    namaRuas: str
    tipeJalan: str = "4/2 D"
    jumlahLajur: int = 2
    lebarLajur: float = 3.5
    faktorPemisah: str = "50-50"
    hambatanSamping: str = "rendah"
    ukuranKota: str = "besar"
    
    # Data kendaraan
    mobil: int = 0
    bus: int = 0
    truk: int = 0
    motor: int = 0
    
    # Durasi observasi
    durasiMenit: int = 60
    waktuObservasi: str = ""


class CalculationResult(BaseModel):
    success: bool = True
    message: str
    data: Dict[str, Any]
