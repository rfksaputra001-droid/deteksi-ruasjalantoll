# 📤 YOLO Output Video to Cloudinary Integration

## Overview
Semua output video dari YOLO processing otomatis di-upload ke Cloudinary CDN.

---

## ✅ Features

### 1. **Automatic Upload**
- ✅ Output video di-upload otomatis setelah YOLO processing selesai
- ✅ Non-blocking upload (async process)
- ✅ Error handling - jika upload gagal, tetap menyimpan lokal

### 2. **Configuration**
```env
CLOUDINARY_CLOUD_NAME=dvyh5eatc
CLOUDINARY_API_KEY=772892118724795
CLOUDINARY_API_SECRET=3PJ--EHHiq5M8qvqaLt_XtxIVzE
CLOUDINARY_FOLDER=yolo-deteksi
```

### 3. **Storage**
```
Cloudinary Folder: yolo-deteksi
File naming: output-{detectionId}.mp4
Example: output-69520e64bc98c0e8dec4c1b8.mp4
```

---

## 🔄 Data Flow

```
Video Upload
    ↓
YOLO Processing (Python)
    ↓
Generate Output Video (output.mp4)
    ↓
Parallel Operations:
  ├─ Save to Local: /uploads/detections/{id}/output.mp4
  ├─ Upload to Cloudinary: yolo-deteksi/output-{id}.mp4
  └─ Save Results JSON: /uploads/detections/{id}/results.json
    ↓
Update MongoDB with:
  - outputVideoPath (local)
  - cloudinaryVideoUrl (CDN)
  - cloudinaryVideoId (public_id)
  - detailResults (frame data)
```

---

## 📊 Response Data

### GET /api/deteksi/result/:detectionId

```json
{
  "success": true,
  "data": {
    "_id": "69520e64bc98c0e8dec4c1b8",
    "status": "completed",
    "totalVehicles": 0,
    "accuracy": 0,
    "processingTime": 10.32,
    "frameCount": 75,
    
    // Local paths
    "outputVideoPath": "/home/rifki/project/yolo-backend/uploads/detections/69520e64bc98c0e8dec4c1b8/output.mp4",
    "resultsPath": "/home/rifki/project/yolo-backend/uploads/detections/69520e64bc98c0e8dec4c1b8/results.json",
    
    // Cloudinary
    "cloudinaryVideoUrl": "https://res.cloudinary.com/dvyh5eatc/video/upload/v1766985329/yolo-deteksi/output-69520e64bc98c0e8dec4c1b8.mp4",
    "cloudinaryVideoId": "yolo-deteksi/output-69520e64bc98c0e8dec4c1b8",
    
    // Detailed results
    "detailResults": {
      "total_frames": 75,
      "total_vehicles": 0,
      "vehicle_detections": [],
      "status": "completed"
    }
  }
}
```

---

## 🎯 Usage Examples

### Download dari Cloudinary
```bash
# Direct URL access (streaming)
https://res.cloudinary.com/dvyh5eatc/video/upload/v1766985329/yolo-deteksi/output-69520e64bc98c0e8dec4c1b8.mp4

# Download with transformations
https://res.cloudinary.com/dvyh5eatc/video/upload/q_auto,f_mp4/v1766985329/yolo-deteksi/output-69520e64bc98c0e8dec4c1b8.mp4
```

### Implementasi di Frontend
```javascript
// Ambil detection result
const response = await fetch(`/api/deteksi/result/${detectionId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const data = await response.json();

// Gunakan Cloudinary URL untuk streaming
const videoUrl = data.data.cloudinaryVideoUrl;

// HTML Video Player
<video controls width="640" height="480">
  <source src={videoUrl} type="video/mp4" />
</video>
```

---

## ✅ Verification Checklist

- ✅ Output video di-generate oleh YOLO
- ✅ Disimpan lokal: `/uploads/detections/{id}/output.mp4`
- ✅ Di-upload ke Cloudinary: `yolo-deteksi/output-{id}.mp4`
- ✅ URL disimpan di MongoDB: `cloudinaryVideoUrl`
- ✅ Public ID disimpan: `cloudinaryVideoId`
- ✅ File dapat diakses via HTTP streaming
- ✅ Error handling: Lokal fallback jika upload gagal

---

## 🔒 Security Notes

- Cloudinary API key & secret sudah dikonfigurasi di `.env`
- Public ID: `yolo-deteksi/output-{detectionId}` - predictable untuk validasi
- Recommend: Add rate limiting for API requests
- Recommend: Restrict Cloudinary folder permissions

---

## 📈 Benefits

1. **CDN Distribution** - Video diakses lebih cepat ke seluruh dunia
2. **Bandwidth Optimization** - Cloudinary menghandle compression & caching
3. **Backup** - Data tersimpan di cloud untuk durability
4. **Streaming** - Support adaptive bitrate streaming
5. **Transformations** - Bisa add watermark, resize, format konversi
