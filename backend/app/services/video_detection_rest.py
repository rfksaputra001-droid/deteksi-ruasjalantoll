"""
REST-based Video Detection Service
Simple polling-based progress tracking - NO WEBSOCKET
Production-ready for Render + Vercel deployment
"""

import os
import uuid
import asyncio
import tempfile
from typing import Dict, List, Optional
from ultralytics import YOLO
import cv2
import numpy as np
from datetime import datetime
import json
from pathlib import Path
import gc

from app.utils.logger import logger
from app.config.cloudinary import upload_to_cloudinary


class VideoDetectionRestService:
    """REST-based video detection service with polling progress"""
    
    def __init__(self):
        self.model = None
        self.custom_model_path = None
        self.model_path = "yolov8n.pt"
        self.processing_tasks: Dict[str, dict] = {}  # Store task status
        
        # Check for custom models
        custom_models = [
            "/tmp/models/best.pt",
            "/tmp/models/vehicle-night-yolo.pt", 
            "/tmp/models/custom.pt",
            "models/best.pt",
            "models/vehicle-night-yolo.pt",
            "backend/models/best.pt"
        ]
        
        for model_path in custom_models:
            if os.path.exists(model_path):
                self.custom_model_path = model_path
                self.model_path = model_path
                logger.info(f"🎯 Found custom model: {model_path}")
                break
    
    def get_processing_status(self, tracking_id: str) -> Optional[dict]:
        """Get current processing status for polling"""
        return self.processing_tasks.get(tracking_id)
    
    def update_status(self, tracking_id: str, status: dict):
        """Update processing status"""
        self.processing_tasks[tracking_id] = {
            **status,
            "updated_at": datetime.utcnow().isoformat()
        }
    
    def clear_status(self, tracking_id: str):
        """Clear processing status after completion"""
        if tracking_id in self.processing_tasks:
            del self.processing_tasks[tracking_id]
    
    async def initialize_model(self):
        """Initialize YOLO model with memory optimization"""
        try:
            if self.model is None:
                logger.info(f"🤖 Loading YOLO model: {self.model_path}")
                
                # Memory cleanup
                gc.collect()
                
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except:
                    pass
                
                self.model = YOLO(self.model_path)
                
                # Warm up model
                test_frame = np.zeros((640, 640, 3), dtype=np.uint8)
                _ = self.model(test_frame, verbose=False)
                
                logger.info(f"✅ YOLO model loaded: {len(self.model.names)} classes")
                gc.collect()
            return True
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO model: {e}")
            return False
    
    def _normalize_vehicle_type(self, vehicle_type: str) -> str:
        """Normalize vehicle type"""
        vt = vehicle_type.lower()
        if any(k in vt for k in ['car', 'mobil', 'sedan', 'suv']):
            return "mobil"
        elif any(k in vt for k in ['motorcycle', 'motor', 'bike']):
            return "motor"
        elif any(k in vt for k in ['truck', 'truk']):
            return "truk"
        elif 'bus' in vt:
            return "bus"
        return vehicle_type
    
    def _get_class_color(self, vehicle_type: str) -> tuple:
        """Get color for class visualization"""
        colors = {
            "mobil": (0, 255, 0),
            "motor": (255, 0, 0),
            "truk": (0, 0, 255),
            "bus": (255, 255, 0),
            "car": (0, 255, 0),
            "motorcycle": (255, 0, 0),
            "truck": (0, 0, 255),
        }
        return colors.get(vehicle_type.lower(), (128, 128, 128))
    
    async def process_video_async(self, 
                                  tracking_id: str, 
                                  video_file_path: str, 
                                  user_id: str,
                                  filename: str):
        """
        Background video processing - status updated for polling
        """
        try:
            logger.info(f"🎬 Processing video: {tracking_id}")
            
            # Initialize status
            self.update_status(tracking_id, {
                "status": "initializing",
                "progress": 0,
                "message": "Memulai proses deteksi...",
                "tracking_id": tracking_id
            })
            
            # Initialize model
            if not await self.initialize_model():
                self.update_status(tracking_id, {
                    "status": "error",
                    "progress": 0,
                    "message": "Gagal memuat model YOLO",
                    "error": "Model initialization failed"
                })
                return None
            
            self.update_status(tracking_id, {
                "status": "processing",
                "progress": 5,
                "message": "Model YOLO siap, membuka video..."
            })
            
            # Open video
            cap = cv2.VideoCapture(video_file_path)
            if not cap.isOpened():
                self.update_status(tracking_id, {
                    "status": "error",
                    "message": "Tidak dapat membuka file video"
                })
                return None
            
            # Get video info
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = total_frames / fps if fps > 0 else 0
            
            logger.info(f"📊 Video: {total_frames} frames, {fps:.1f} FPS, {width}x{height}")
            
            self.update_status(tracking_id, {
                "status": "processing",
                "progress": 10,
                "message": f"Menganalisis video ({total_frames} frame)...",
                "total_frames": total_frames,
                "fps": fps,
                "duration": round(duration, 2)
            })
            
            # Setup output
            os.makedirs("/tmp/temp", exist_ok=True)
            output_path = f"/tmp/temp/detected_{tracking_id}.mp4"
            
            # Scale down if needed
            if width > 1280 or height > 720:
                scale = min(1280/width, 720/height)
                new_width, new_height = int(width * scale), int(height * scale)
            else:
                new_width, new_height = width, height
            
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (new_width, new_height))
            
            # Process frames
            detections = []
            vehicle_counts = {"mobil": 0, "motor": 0, "truk": 0, "bus": 0}
            frame_count = 0
            skip_frames = max(1, int(fps / 10))  # Process ~10 frames per second
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Resize if needed
                if (new_width, new_height) != (width, height):
                    frame = cv2.resize(frame, (new_width, new_height))
                
                # Run detection on selected frames
                if frame_count % skip_frames == 0:
                    results = self.model(frame, verbose=False)[0]
                    
                    for box in results.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        
                        class_name = self.model.names[cls]
                        vehicle_type = self._normalize_vehicle_type(class_name)
                        
                        if vehicle_type in vehicle_counts:
                            vehicle_counts[vehicle_type] += 1
                        
                        color = self._get_class_color(vehicle_type)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame, f"{vehicle_type} {conf:.2f}", 
                                   (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 
                                   0.5, color, 2)
                        
                        detections.append({
                            "frame": frame_count,
                            "class": vehicle_type,
                            "confidence": round(conf, 3),
                            "bbox": [x1, y1, x2, y2]
                        })
                
                out.write(frame)
                
                # Update progress every 10%
                if frame_count % max(1, total_frames // 10) == 0:
                    progress = min(90, 10 + int((frame_count / total_frames) * 80))
                    self.update_status(tracking_id, {
                        "status": "processing",
                        "progress": progress,
                        "message": f"Memproses frame {frame_count}/{total_frames}",
                        "current_frame": frame_count,
                        "total_frames": total_frames,
                        "vehicle_counts": vehicle_counts.copy()
                    })
                
                # Memory cleanup periodically
                if frame_count % 100 == 0:
                    gc.collect()
            
            cap.release()
            out.release()
            
            self.update_status(tracking_id, {
                "status": "uploading",
                "progress": 92,
                "message": "Mengunggah video hasil deteksi..."
            })
            
            # Upload to Cloudinary
            processed_url = None
            try:
                processed_url = await upload_to_cloudinary(output_path, f"detected_{tracking_id}")
                logger.info(f"✅ Uploaded to Cloudinary: {processed_url}")
            except Exception as e:
                logger.warning(f"⚠️ Cloudinary upload failed: {e}")
            
            # Save to database
            from app.config.database import get_collection
            from bson import ObjectId
            
            deteksi_collection = get_collection("deteksi")
            
            # Counting data for perhitungan
            counting_data = {
                "laneKiri": {
                    "mobil": vehicle_counts.get("mobil", 0) // 2,
                    "motor": vehicle_counts.get("motor", 0) // 2,
                    "bus": vehicle_counts.get("bus", 0) // 2,
                    "truk": vehicle_counts.get("truk", 0) // 2
                },
                "laneKanan": {
                    "mobil": vehicle_counts.get("mobil", 0) - vehicle_counts.get("mobil", 0) // 2,
                    "motor": vehicle_counts.get("motor", 0) - vehicle_counts.get("motor", 0) // 2,
                    "bus": vehicle_counts.get("bus", 0) - vehicle_counts.get("bus", 0) // 2,
                    "truk": vehicle_counts.get("truk", 0) - vehicle_counts.get("truk", 0) // 2
                }
            }
            
            result_doc = {
                "_id": tracking_id,
                "userId": ObjectId(user_id) if isinstance(user_id, str) else user_id,
                "filename": filename,
                "status": "completed",
                "videoInfo": {
                    "totalFrames": total_frames,
                    "fps": fps,
                    "duration": round(duration, 2),
                    "resolution": f"{width}x{height}"
                },
                "detectionResults": {
                    "totalDetections": len(detections),
                    "vehicleCounts": vehicle_counts,
                    "detections": detections[:100]  # Limit stored detections
                },
                "countingData": counting_data,
                "processedVideoUrl": processed_url,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            await deteksi_collection.insert_one(result_doc)
            logger.info(f"✅ Detection saved: {tracking_id}")
            
            # Cleanup
            try:
                os.remove(video_file_path)
                os.remove(output_path)
            except:
                pass
            
            # Final status
            self.update_status(tracking_id, {
                "status": "completed",
                "progress": 100,
                "message": "Deteksi selesai!",
                "result": {
                    "tracking_id": tracking_id,
                    "filename": filename,
                    "total_detections": len(detections),
                    "vehicle_counts": vehicle_counts,
                    "processed_video_url": processed_url,
                    "video_info": {
                        "total_frames": total_frames,
                        "fps": fps,
                        "duration": round(duration, 2)
                    }
                }
            })
            
            gc.collect()
            return result_doc
            
        except Exception as e:
            logger.error(f"❌ Processing error: {str(e)}")
            self.update_status(tracking_id, {
                "status": "error",
                "progress": 0,
                "message": f"Gagal memproses video: {str(e)}",
                "error": str(e)
            })
            
            # Cleanup
            try:
                os.remove(video_file_path)
            except:
                pass
            
            return None
    
    async def start_detection(self, 
                             tracking_id: str,
                             video_file_path: str,
                             user_id: str,
                             filename: str):
        """Start background detection task"""
        # Initialize status
        self.update_status(tracking_id, {
            "status": "queued",
            "progress": 0,
            "message": "Antrian proses deteksi...",
            "tracking_id": tracking_id
        })
        
        # Start async task
        asyncio.create_task(
            self.process_video_async(tracking_id, video_file_path, user_id, filename)
        )
        
        return tracking_id


# Global service instance
video_detection_rest_service = VideoDetectionRestService()
