"""
Complete YOLO Video Detection Service
Production-ready with error handling, progress tracking, and optimization
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

from app.utils.logger import logger
from app.core.socket import socket_manager
from app.config.cloudinary import upload_to_cloudinary


class VideoDetectionService:
    """Complete video detection service with real-time progress"""
    
    def __init__(self):
        self.model = None
        self.custom_model_path = None
        self.model_path = "yolov8n.pt"  # Default model
        self.processing_tasks: Dict[str, asyncio.Task] = {}
        
        # Check for custom model in models directory
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
        
    async def initialize_model(self):
        """Initialize YOLO model with error handling"""
        try:
            if self.model is None:
                if self.custom_model_path:
                    logger.info(f"🚀 Loading CUSTOM YOLO model: {self.custom_model_path}")
                else:
                    logger.info(f"🤖 Loading default YOLO model: {self.model_path}")
                self.model = YOLO(self.model_path)
                logger.info("✅ YOLO model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO model: {e}")
            return False
    
    def _normalize_vehicle_type(self, vehicle_type: str) -> str:
        """Normalize vehicle type from custom models to standard categories"""
        vehicle_type_lower = vehicle_type.lower()
        
        # Map common vehicle type variations
        if any(keyword in vehicle_type_lower for keyword in ['car', 'mobil', 'sedan', 'suv']):
            return "mobil"
        elif any(keyword in vehicle_type_lower for keyword in ['motorcycle', 'motor', 'bike']):
            return "motor"  
        elif any(keyword in vehicle_type_lower for keyword in ['truck', 'truk']):
            return "truk"
        elif any(keyword in vehicle_type_lower for keyword in ['bus']):
            return "bus"
        else:
            return vehicle_type  # Keep original if no match
    
    def _get_class_color(self, vehicle_type: str) -> tuple:
        """Get color for class visualization"""
        color_map = {
            "mobil": (0, 255, 0),    # Green
            "motor": (255, 0, 0),    # Red  
            "truk": (0, 0, 255),     # Blue
            "bus": (255, 255, 0),    # Yellow
            "car": (0, 255, 0),      # Green
            "motorcycle": (255, 0, 0),  # Red
            "truck": (0, 0, 255),    # Blue
        }
        
        return color_map.get(vehicle_type.lower(), (128, 128, 128))  # Gray for unknown
    
    async def process_video(self, 
                          tracking_id: str, 
                          video_file_path: str, 
                          user_id: str,
                          filename: str) -> Dict:
        """
        Complete video processing pipeline with real-time progress
        """
        try:
            logger.info(f"🎬 Starting video processing for {tracking_id}: {filename}")
            
            # Initialize model
            if not await self.initialize_model():
                raise Exception("Failed to initialize YOLO model")
            
            # Emit start progress
            await socket_manager.emit_progress(tracking_id, {
                "stage": "starting",
                "message": "Memulai deteksi video...",
                "progress": 0,
                "trackingId": tracking_id
            })
            
            # Step 1: Video validation and info
            logger.info(f"📹 Opening video file: {video_file_path}")
            cap = cv2.VideoCapture(video_file_path)
            if not cap.isOpened():
                raise Exception(f"Tidak dapat membuka file video: {video_file_path}")
            
            # Get video info
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = total_frames / fps if fps > 0 else 0
            
            logger.info(f"📊 Video info: {total_frames} frames, {fps:.1f} FPS, {width}x{height}")
            
            await socket_manager.emit_progress(tracking_id, {
                "stage": "analyzing",
                "message": f"Video info: {total_frames} frames, {fps:.1f} FPS",
                "progress": 10,
                "trackingId": tracking_id,
                "video_info": {
                    "total_frames": total_frames,
                    "fps": fps,
                    "duration": duration,
                    "resolution": f"{width}x{height}"
                }
            })
            
            # Step 2: Frame-by-frame detection
            detections = []
            frame_count = 0
            vehicle_counts = {"mobil": 0, "motor": 0, "truk": 0, "bus": 0}
            
            # Create output video writer
            output_path = f"/tmp/temp/detected_{tracking_id}.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Run YOLO detection on frame
                # For custom models, use all classes; for default, filter vehicle classes
                if self.custom_model_path:
                    results = self.model(frame, conf=0.25)  # Use all classes from custom model
                else:
                    results = self.model(frame, conf=0.25, classes=[1, 2, 3, 5, 6, 7])  # COCO vehicle classes
                
                # Process detections
                frame_detections = []
                annotated_frame = frame.copy()
                
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for box in boxes:
                            # Extract detection data
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            confidence = box.conf[0].cpu().numpy()
                            class_id = int(box.cls[0].cpu().numpy())
                            
                            # Dynamic class mapping
                            if self.custom_model_path:
                                # For custom models, try to get class names from model
                                try:
                                    class_names = self.model.names
                                    vehicle_type = class_names.get(class_id, f"class_{class_id}")
                                except:
                                    vehicle_type = f"detected_{class_id}"
                            else:
                                # Default COCO class mapping
                                class_map = {1: "mobil", 2: "motor", 3: "mobil", 5: "bus", 6: "truk", 7: "truk"}
                                vehicle_type = class_map.get(class_id, "unknown")
                            
                            if vehicle_type != "unknown":
                                # Count vehicles (normalize custom class names)
                                normalized_type = self._normalize_vehicle_type(vehicle_type)
                                vehicle_counts[normalized_type] = vehicle_counts.get(normalized_type, 0) + 1
                                
                                # Store detection
                                frame_detections.append({
                                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                                    "confidence": float(confidence),
                                    "class": vehicle_type,
                                    "class_id": class_id,
                                    "frame": frame_count
                                })
                                
                                # Draw bounding box on frame with dynamic color
                                color = self._get_class_color(vehicle_type)
                                cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                                cv2.putText(annotated_frame, f"{vehicle_type} {confidence:.2f}", 
                                          (int(x1), int(y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                # Write annotated frame
                out.write(annotated_frame)
                
                # Store frame detections
                if frame_detections:
                    detections.append({
                        "frame": frame_count,
                        "timestamp": frame_count / fps,
                        "detections": frame_detections
                    })
                
                # Emit progress every 30 frames
                if frame_count % 30 == 0:
                    progress = min(90, int((frame_count / total_frames) * 80) + 10)
                    await socket_manager.emit_progress(tracking_id, {
                        "stage": "detecting",
                        "message": f"Memproses frame {frame_count}/{total_frames}",
                        "progress": progress,
                        "current_counts": vehicle_counts.copy()
                    })
            
            # Release resources
            cap.release()
            out.release()
            
            # Step 3: Upload results to Cloudinary (optional)
            await socket_manager.emit_progress(tracking_id, {
                "stage": "uploading", 
                "message": "Mengunggah video hasil deteksi...",
                "progress": 90,
                "trackingId": tracking_id
            })
            
            # Upload processed video (with fallback)
            video_url = None
            try:
                video_url = await upload_to_cloudinary(output_path, f"deteksi/{tracking_id}")
                logger.info(f"✅ Video uploaded to Cloudinary: {video_url}")
                # Clean up local file after successful upload
                if os.path.exists(output_path):
                    os.remove(output_path)
            except Exception as e:
                logger.warning(f"⚠️ Failed to upload video to Cloudinary: {e}")
                # Keep local file as fallback
                logger.info(f"💾 Video saved locally: {output_path}")
                video_url = f"local://{output_path}"  # Fallback URL
            
            # Step 4: Prepare final results
            final_results = {
                "tracking_id": tracking_id,
                "user_id": user_id,
                "filename": filename,
                "video_info": {
                    "total_frames": total_frames,
                    "fps": fps,
                    "duration": duration,
                    "resolution": f"{width}x{height}"
                },
                "detection_results": {
                    "total_detections": len([d for frame in detections for d in frame["detections"]]),
                    "vehicle_counts": vehicle_counts,
                    "frame_detections": detections[:100]  # Limit to first 100 frames for storage
                },
                "processed_video_url": video_url,
                "processing_time": datetime.utcnow(),
                "status": "completed"
            }
            
            # Step 5: Save to database (if available)
            try:
                from app.config.database import get_collection
                deteksi_collection = get_collection("deteksi")
                await deteksi_collection.insert_one({
                    "_id": tracking_id,
                    "userId": user_id,
                    "filename": filename,
                    "videoInfo": final_results["video_info"],
                    "detectionResults": final_results["detection_results"],
                    "processedVideoUrl": video_url,
                    "createdAt": datetime.utcnow(),
                    "status": "completed"
                })
            except Exception as e:
                logger.warning(f"Failed to save to database: {e}")
            
            # Emit completion
            await socket_manager.emit_progress(tracking_id, {
                "stage": "completed",
                "message": "Deteksi selesai!",
                "progress": 100,
                "trackingId": tracking_id,
                "results": final_results
            })
            
            logger.info(f"✅ Video processing completed for {tracking_id}")
            return final_results
            
        except Exception as e:
            logger.error(f"❌ Video processing error for {tracking_id}: {e}")
            await socket_manager.emit_progress(tracking_id, {
                "stage": "error",
                "message": f"Error: {str(e)}",
                "progress": 0,
                "trackingId": tracking_id,
                "error": str(e)
            })
            raise
        
        finally:
            # Cleanup
            if tracking_id in self.processing_tasks:
                del self.processing_tasks[tracking_id]
            
            # Clean up temp files
            try:
                if os.path.exists(video_file_path):
                    os.remove(video_file_path)
                if 'output_path' in locals() and os.path.exists(output_path):
                    os.remove(output_path)
            except:
                pass
    
    async def start_detection(self, 
                            tracking_id: str, 
                            video_file_path: str, 
                            user_id: str,
                            filename: str):
        """Start video detection as background task"""
        task = asyncio.create_task(
            self.process_video(tracking_id, video_file_path, user_id, filename)
        )
        self.processing_tasks[tracking_id] = task
        return task
    
    def get_processing_status(self, tracking_id: str) -> Optional[str]:
        """Get current processing status"""
        if tracking_id in self.processing_tasks:
            task = self.processing_tasks[tracking_id]
            if task.done():
                return "completed"
            else:
                return "processing"
        return None


# Global service instance
video_detection_service = VideoDetectionService()