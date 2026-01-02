"""
Perhitungan Routes - Traffic Calculation API (PKJI 2023)
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from app.config.database import get_collection
from app.config.constants import (
    KAPASITAS_DASAR, FAKTOR_LEBAR, FAKTOR_PEMISAH, 
    FAKTOR_HAMBATAN, FAKTOR_KOTA, EMP, LOS_THRESHOLDS
)
from app.models.perhitungan import ManualCalculationRequest
from app.middleware.auth import get_current_user, get_surveyor_or_admin
from app.utils.logger import logger

router = APIRouter()


def hitung_kapasitas(tipe_jalan: str, jumlah_lajur: int, lebar_lajur: float,
                     faktor_pemisah: str, hambatan_samping: str, ukuran_kota: str) -> dict:
    """Calculate road capacity based on PKJI 2023"""
    
    # Base capacity
    C0 = KAPASITAS_DASAR.get(tipe_jalan, 1650)
    
    # Width factor (find closest match)
    lebar_keys = list(FAKTOR_LEBAR.keys())
    closest_lebar = min(lebar_keys, key=lambda x: abs(x - lebar_lajur))
    FCw = FAKTOR_LEBAR.get(closest_lebar, 1.00)
    
    # Separator factor
    FCsp = FAKTOR_PEMISAH.get(faktor_pemisah, 1.00)
    
    # Side friction factor
    FCsf = FAKTOR_HAMBATAN.get(hambatan_samping, 1.00)
    
    # City size factor
    FCcs = FAKTOR_KOTA.get(ukuran_kota, 0.94)
    
    # Calculate capacity
    n = 1 if '2/2' in tipe_jalan else jumlah_lajur
    kapasitas = n * C0 * FCw * FCsp * FCsf * FCcs
    
    return {
        'kapasitas': round(kapasitas),
        'detail': {
            'n': n,
            'C0': C0,
            'FCw': FCw,
            'FCsp': FCsp,
            'FCsf': FCsf,
            'FCcs': FCcs
        }
    }


def hitung_volume_smp(mobil: int, bus: int, truk: int, motor: int, durasi_menit: int) -> dict:
    """Calculate traffic volume in SMP/hour"""
    
    smp_mobil = mobil * EMP['mobil']
    smp_bus = bus * EMP['bus']
    smp_truk = truk * EMP['truk']
    smp_motor = motor * EMP['motor']
    
    total_smp = smp_mobil + smp_bus + smp_truk + smp_motor
    
    # Convert to per hour
    faktor_jam = 60 / durasi_menit
    volume_per_jam = total_smp * faktor_jam
    
    return {
        'volumeSMP': round(volume_per_jam),
        'detail': {
            'mobil': {'count': mobil, 'smp': smp_mobil},
            'bus': {'count': bus, 'smp': smp_bus},
            'truk': {'count': truk, 'smp': smp_truk},
            'motor': {'count': motor, 'smp': smp_motor},
            'totalKendaraan': mobil + bus + truk + motor,
            'totalSMPRaw': total_smp,
            'durasiMenit': durasi_menit,
            'faktorJam': faktor_jam
        }
    }


def hitung_derajat_jenuh(volume: float, kapasitas: float) -> float:
    """Calculate degree of saturation (DJ)"""
    if kapasitas <= 0:
        return 0
    dj = volume / kapasitas
    return min(dj, 2)  # Cap at 2 for extreme cases


def tentukan_los(dj: float) -> str:
    """Determine Level of Service based on DJ"""
    if dj <= 0.20:
        return 'A'
    if dj <= 0.44:
        return 'B'
    if dj <= 0.72:
        return 'C'
    if dj <= 0.84:
        return 'D'
    if dj <= 0.92:
        return 'E'
    return 'F'


def get_los_description(los: str) -> str:
    """Get LOS description"""
    descriptions = {
        'A': 'Kondisi arus bebas dengan kecepatan tinggi',
        'B': 'Arus stabil dengan kecepatan mulai dibatasi',
        'C': 'Arus stabil dengan kecepatan terbatas',
        'D': 'Arus mendekati tidak stabil',
        'E': 'Arus tidak stabil, sering berhenti',
        'F': 'Arus dipaksa atau macet'
    }
    return descriptions.get(los, 'Tidak diketahui')


@router.post("/manual")
async def hitung_manual(request: ManualCalculationRequest, user: dict = Depends(get_surveyor_or_admin)):
    """Calculate traffic metrics from manual input"""
    try:
        perhitungan = get_collection("perhitungan")
        
        # Calculate capacity
        kapasitas_result = hitung_kapasitas(
            request.tipeJalan,
            request.jumlahLajur,
            request.lebarLajur,
            request.faktorPemisah,
            request.hambatanSamping,
            request.ukuranKota
        )
        
        # Calculate volume in SMP
        volume_result = hitung_volume_smp(
            request.mobil,
            request.bus,
            request.truk,
            request.motor,
            request.durasiMenit
        )
        
        # Calculate DJ
        dj = hitung_derajat_jenuh(volume_result['volumeSMP'], kapasitas_result['kapasitas'])
        
        # Determine LOS
        los = tentukan_los(dj)
        
        # Prepare data
        total_kendaraan = request.mobil + request.bus + request.truk + request.motor
        
        perhitungan_data = {
            "userId": ObjectId(user["_id"]),
            "jumlahMobil": request.mobil,
            "jumlahMotor": request.motor,
            "totalKendaraan": total_kendaraan,
            "DJ": round(dj, 4),
            "LOS": los,
            "waktuProses": datetime.utcnow(),
            "metrics": {
                "namaRuas": request.namaRuas,
                "tipeJalan": request.tipeJalan,
                "kapasitas": kapasitas_result['kapasitas'],
                "flowRate": volume_result['volumeSMP'],
                "durasiMenit": request.durasiMenit,
                "waktuObservasi": request.waktuObservasi,
                "bus": request.bus,
                "truk": request.truk,
                "kapasitasDetail": kapasitas_result['detail'],
                "volumeDetail": volume_result['detail']
            },
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await perhitungan.insert_one(perhitungan_data)
        
        logger.info(f"Manual calculation saved: {result.inserted_id}")
        
        return {
            "success": True,
            "message": "Perhitungan berhasil",
            "data": {
                "id": str(result.inserted_id),
                "namaRuas": request.namaRuas,
                "tipeJalan": request.tipeJalan,
                "kapasitas": kapasitas_result,
                "volume": volume_result,
                "DJ": round(dj, 4),
                "LOS": los,
                "losDescription": get_los_description(los),
                "totalKendaraan": total_kendaraan,
                "waktuObservasi": request.waktuObservasi
            }
        }
        
    except Exception as e:
        logger.error(f"Manual calculation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.post("/from-deteksi/{deteksi_id}")
async def hitung_from_deteksi(
    deteksi_id: str,
    nama_ruas: str,
    tipe_jalan: str = "4/2 D",
    jumlah_lajur: int = 2,
    lebar_lajur: float = 3.5,
    faktor_pemisah: str = "50-50",
    hambatan_samping: str = "rendah",
    ukuran_kota: str = "besar",
    durasi_menit: int = 60,
    waktu_observasi: str = "",
    user: dict = Depends(get_surveyor_or_admin)
):
    """Calculate traffic metrics from detection results"""
    try:
        deteksi = get_collection("deteksi")
        perhitungan = get_collection("perhitungan")
        
        # Get detection result
        det_result = await deteksi.find_one({"_id": ObjectId(deteksi_id)})
        
        if not det_result:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Detection not found"}
            )
        
        # Extract counting data
        counting_data = det_result.get("countingData", {})
        lane_kiri = counting_data.get("laneKiri", {})
        lane_kanan = counting_data.get("laneKanan", {})
        
        # Sum up vehicles
        mobil = lane_kiri.get("mobil", 0) + lane_kanan.get("mobil", 0)
        bus = lane_kiri.get("bus", 0) + lane_kanan.get("bus", 0)
        truk = lane_kiri.get("truk", 0) + lane_kanan.get("truk", 0)
        motor = 0  # YOLO model doesn't detect motorcycles currently
        
        # Calculate capacity
        kapasitas_result = hitung_kapasitas(
            tipe_jalan, jumlah_lajur, lebar_lajur,
            faktor_pemisah, hambatan_samping, ukuran_kota
        )
        
        # Calculate volume
        volume_result = hitung_volume_smp(mobil, bus, truk, motor, durasi_menit)
        
        # Calculate DJ and LOS
        dj = hitung_derajat_jenuh(volume_result['volumeSMP'], kapasitas_result['kapasitas'])
        los = tentukan_los(dj)
        
        total_kendaraan = mobil + bus + truk + motor
        
        # Save to database
        perhitungan_data = {
            "userId": ObjectId(user["_id"]),
            "idDeteksi": ObjectId(deteksi_id),
            "jumlahMobil": mobil,
            "jumlahMotor": motor,
            "totalKendaraan": total_kendaraan,
            "DJ": round(dj, 4),
            "LOS": los,
            "waktuProses": datetime.utcnow(),
            "metrics": {
                "namaRuas": nama_ruas,
                "tipeJalan": tipe_jalan,
                "kapasitas": kapasitas_result['kapasitas'],
                "flowRate": volume_result['volumeSMP'],
                "durasiMenit": durasi_menit,
                "waktuObservasi": waktu_observasi,
                "deteksiId": ObjectId(deteksi_id),
                "bus": bus,
                "truk": truk,
                "countingData": counting_data
            },
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await perhitungan.insert_one(perhitungan_data)
        
        logger.info(f"Calculation from detection saved: {result.inserted_id}")
        
        return {
            "success": True,
            "message": "Perhitungan dari deteksi berhasil",
            "data": {
                "id": str(result.inserted_id),
                "deteksiId": deteksi_id,
                "namaRuas": nama_ruas,
                "kapasitas": kapasitas_result,
                "volume": volume_result,
                "DJ": round(dj, 4),
                "LOS": los,
                "losDescription": get_los_description(los),
                "countingData": counting_data,
                "totalKendaraan": total_kendaraan
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calculation from detection error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/referensi")
async def get_referensi(user: dict = Depends(get_current_user)):
    """Get PKJI 2023 reference data"""
    try:
        referensi_data = {
            "tipeJalan": list(KAPASITAS_DASAR.keys()),
            "lebarLajur": list(FAKTOR_LEBAR.keys()),
            "faktorPemisah": list(FAKTOR_PEMISAH.keys()),
            "hambatanSamping": list(FAKTOR_HAMBATAN.keys()),
            "ukuranKota": list(FAKTOR_KOTA.keys()),
            "emp": EMP,
            "losThresholds": LOS_THRESHOLDS
        }
        
        return {
            "success": True,
            "data": referensi_data
        }
        
    except Exception as e:
        logger.error(f"Get referensi error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/")
async def list_perhitungan(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """List calculations with pagination"""
    try:
        perhitungan = get_collection("perhitungan")
        
        # Build query - all users can see all data
        query = {}
        
        # Get total count
        total = await perhitungan.count_documents(query)
        
        # Get data
        cursor = perhitungan.find(query).sort("createdAt", -1).skip((page - 1) * limit).limit(limit)
        data_list = await cursor.to_list(length=limit)
        
        # Convert ObjectIds
        for item in data_list:
            item["id"] = str(item["_id"])
            del item["_id"]
            item["userId"] = str(item.get("userId", ""))
            if item.get("idDeteksi"):
                item["idDeteksi"] = str(item["idDeteksi"])
            if item.get("idVideo"):
                item["idVideo"] = str(item["idVideo"])
        
        return {
            "success": True,
            "data": data_list,
            "pagination": {
                "currentPage": page,
                "totalPages": (total + limit - 1) // limit,
                "totalItems": total,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"List perhitungan error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.get("/{perhitungan_id}")
async def get_perhitungan(perhitungan_id: str, user: dict = Depends(get_current_user)):
    """Get single calculation by ID"""
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(perhitungan_id):
            raise HTTPException(
                status_code=400,
                detail={"success": False, "message": f"Invalid perhitungan ID format: {perhitungan_id}"}
            )
        
        perhitungan = get_collection("perhitungan")
        
        result = await perhitungan.find_one({"_id": ObjectId(perhitungan_id)})
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Perhitungan not found"}
            )
        
        result["id"] = str(result["_id"])
        del result["_id"]
        result["userId"] = str(result.get("userId", ""))
        if result.get("idDeteksi"):
            result["idDeteksi"] = str(result["idDeteksi"])
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get perhitungan error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )


@router.delete("/{perhitungan_id}")
async def delete_perhitungan(perhitungan_id: str, user: dict = Depends(get_surveyor_or_admin)):
    """Delete calculation"""
    try:
        perhitungan = get_collection("perhitungan")
        
        result = await perhitungan.delete_one({"_id": ObjectId(perhitungan_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "message": "Perhitungan not found"}
            )
        
        logger.info(f"Perhitungan deleted: {perhitungan_id}")
        
        return {
            "success": True,
            "message": "Perhitungan berhasil dihapus"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete perhitungan error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": str(e)}
        )
