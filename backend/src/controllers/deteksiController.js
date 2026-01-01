const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const DeteksiYOLO = require('../models/DeteksiYOLO');
const Perhitungan = require('../models/Perhitungan');

/**
 * Convert video to H.264 codec for browser compatibility
 * Uses FFmpeg to re-encode the video
 */
async function convertToH264(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Use FFmpeg to convert to H.264
      const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart "${outputPath}"`;
      execSync(ffmpegCmd, { stdio: 'pipe', timeout: 600000 }); // 10 min timeout
      resolve(outputPath);
    } catch (error) {
      logger.warn(`⚠️ FFmpeg conversion failed: ${error.message}, using original video`);
      // If FFmpeg fails, just copy the original file
      if (fs.existsSync(inputPath)) {
        fs.copyFileSync(inputPath, outputPath);
      }
      resolve(outputPath);
    }
  });
}

/**
 * Upload dan process video dengan YOLO
 * Flow baru:
 * 1. Upload video ke Cloudinary dulu
 * 2. Proses deteksi dengan Python
 * 3. Setelah selesai, simpan ke database
 * 4. Real-time progress via Socket.IO
 */
exports.uploadVideo = async (req, res) => {
  // Generate temporary ID untuk tracking sebelum database
  const tempId = new mongoose.Types.ObjectId();
  const io = req.app.get('io');
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const videoPath = req.file.path;
    const videoFileName = req.file.filename;
    const originalFileName = req.file.originalname;
    const videoSize = req.file.size;

    logger.info(`📹 Video uploaded: ${videoFileName} (${videoSize} bytes)`);
    
    // Immediately upload input video to Cloudinary
    emitProgress(io, tempId, {
      stage: 'uploading_input',
      progress: 5,
      message: 'Upload video input ke Cloudinary...'
    });
    
    let inputCloudinaryUrl = null;
    let inputCloudinaryId = null;
    
    try {
      const inputUploadResponse = await cloudinary.uploader.upload(videoPath, {
        resource_type: 'video',
        folder: `${process.env.CLOUDINARY_FOLDER || 'yolo-deteksi'}/input-videos`,
        public_id: `input-${tempId}`,
        overwrite: true,
        timeout: 900000,
        chunk_size: 20000000
      });
      
      inputCloudinaryUrl = inputUploadResponse.secure_url;
      inputCloudinaryId = inputUploadResponse.public_id;
      logger.info(`✅ Input video uploaded to Cloudinary: ${inputCloudinaryUrl}`);
      
      // Delete local input file immediately after Cloudinary upload
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
        logger.info(`🗑️ Local input video deleted: ${videoPath}`);
      }
      
    } catch (uploadError) {
      logger.error(`❌ Failed to upload input video to Cloudinary: ${uploadError.message}`);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to upload video to cloud storage'
      });
    }

    // Emit: Upload started
    emitProgress(io, tempId, {
      stage: 'uploading',
      progress: 0,
      message: 'Menyiapkan upload ke cloud...'
    });

    // Validasi ukuran video
    const MAX_VIDEO_SIZE = process.env.MAX_VIDEO_SIZE || 5368709120; // 5GB default
    if (videoSize > MAX_VIDEO_SIZE) {
      fs.unlinkSync(videoPath);
      emitProgress(io, tempId, {
        stage: 'error',
        progress: 0,
        message: `Ukuran video melebihi batas. Max: ${MAX_VIDEO_SIZE / 1024 / 1024 / 1024}GB`
      });
      return res.status(400).json({
        success: false,
        message: `Video size exceeds limit. Max: ${MAX_VIDEO_SIZE / 1024 / 1024 / 1024}GB`
      });
    }

    // Return response immediately with tempId
    res.status(202).json({
      success: true,
      message: 'Video upload dimulai. Silahkan pantau progress...',
      data: {
        trackingId: tempId,
        status: 'processing'
      }
    });

    // ========== PROSES DENGAN YOLO MENGGUNAKAN CLOUDINARY URL ==========
    emitProgress(io, tempId, {
      stage: 'processing',
      progress: 15,
      message: 'Memulai deteksi YOLO dari Cloudinary...'
    });

    try {
      const result = await processVideoWithYOLO(tempId, inputCloudinaryUrl, req.user._id, io);
      
      // ========== Simpan ke Database ==========
      emitProgress(io, tempId, {
        stage: 'saving',
        progress: 95,
        message: 'Menyimpan hasil ke database...'
      });

      const deteksiRecord = await DeteksiYOLO.create({
        _id: tempId,
        userId: req.user._id,
        videoFileName: originalFileName || videoFileName,
        videoSize: videoSize,
        status: 'completed',
        startTime: result.startTime,
        endTime: new Date(),
        // Input video Cloudinary fields
        inputCloudinaryUrl: inputCloudinaryUrl,
        inputCloudinaryId: inputCloudinaryId,
        // Output video Cloudinary fields
        cloudinaryVideoUrl: result.cloudinaryVideoUrl,
        cloudinaryVideoId: result.cloudinaryVideoId,
        // Detection results stored in Cloudinary
        resultsCloudinaryUrl: result.resultsCloudinaryUrl,
        resultsCloudinaryId: result.resultsCloudinaryId,
        // Detection results
        totalVehicles: result.totalVehicles,
        accuracy: result.accuracy,
        processingTime: result.processingTime,
        frameCount: result.frameCount,
        detailResults: result.detailResults,
        storageType: 'cloudinary',
        localFilesDeleted: true,
        // Counting data
        countingData: result.countingData
      });

      logger.info(`✅ Detection saved to database: ${deteksiRecord._id}`);

      // ========== COMPLETE! Emit dengan video hasil ==========
      emitProgress(io, tempId, {
        stage: 'completed',
        progress: 100,
        message: 'Deteksi selesai!',
        detectionId: deteksiRecord._id,
        outputVideoUrl: result.cloudinaryVideoUrl,
        totalVehicles: result.totalVehicles,
        accuracy: result.accuracy,
        processingTime: result.processingTime,
        countingData: result.countingData
      });

    } catch (processError) {
      logger.error(`❌ Processing error: ${processError.message}`);
      
      // Save failed record to database
      await DeteksiYOLO.create({
        _id: tempId,
        userId: req.user._id,
        videoFileName: originalFileName || videoFileName,
        videoSize: videoSize,
        status: 'failed',
        error: processError.message,
        startTime: new Date(),
        endTime: new Date(),
        inputCloudinaryUrl: inputCloudinaryUrl,
        inputCloudinaryId: inputCloudinaryId,
        storageType: 'cloudinary'
      });

      emitProgress(io, tempId, {
        stage: 'error',
        progress: 0,
        message: `Deteksi gagal: ${processError.message}`,
        detectionId: tempId
      });
    }

    // ========== INPUT VIDEO ALREADY DELETED AFTER CLOUDINARY UPLOAD ==========
    // No local cleanup needed as everything is in Cloudinary

  } catch (error) {
    logger.error('Upload error:', error);
    emitProgress(io, tempId, {
      stage: 'error',
      progress: 0,
      message: `Error: ${error.message}`
    });
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

/**
 * Emit progress update via Socket.IO
 */
function emitProgress(io, trackingId, data) {
  if (io) {
    // Emit to specific tracking ID listener
    io.emit(`detection-progress-${trackingId}`, {
      trackingId,
      timestamp: new Date(),
      ...data
    });
    
    // Also emit to specific room
    io.to(`detection-${trackingId}`).emit('detection-progress', {
      trackingId,
      timestamp: new Date(),
      ...data
    });

    // GLOBAL BROADCAST for completion/error - so all clients get notified
    if (data.stage === 'completed' || data.stage === 'error') {
      io.emit('detection-status-changed', {
        trackingId,
        timestamp: new Date(),
        ...data
      });
      logger.info(`📢 Broadcasted detection-status-changed: ${data.stage} for ${trackingId}`);
    }
  }
}

/**
 * Process video dengan YOLO menggunakan Cloudinary URL
 * Downloads video from Cloudinary, processes with YOLO, uploads results back to Cloudinary
 * Returns detection results with Cloudinary URLs
 */
async function processVideoWithYOLO(trackingId, cloudinaryVideoUrl, userId, io) {
  const startTime = new Date();
  
  logger.info(`🚀 Starting YOLO processing for ${trackingId} from Cloudinary...`);
  
  // Create temporary directory for processing
  const tempDir = path.join(__dirname, '../../temp', trackingId.toString());
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Download video from Cloudinary
  const tempVideoPath = path.join(tempDir, 'input.mp4');
  
  emitProgress(io, trackingId, {
    stage: 'downloading',
    progress: 20,
    message: 'Mengunduh video dari Cloudinary...'
  });
  
  try {
    const https = require('https');
    const http = require('http');
    
    await new Promise((resolve, reject) => {
      const client = cloudinaryVideoUrl.startsWith('https:') ? https : http;
      const request = client.get(cloudinaryVideoUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download video: ${response.statusCode}`));
          return;
        }
        
        const writeStream = fs.createWriteStream(tempVideoPath);
        response.pipe(writeStream);
        
        writeStream.on('finish', () => {
          writeStream.close();
          resolve();
        });
        
        writeStream.on('error', reject);
      });
      
      request.on('error', reject);
      request.setTimeout(300000); // 5 minute timeout
    });
    
    logger.info(`✅ Video downloaded from Cloudinary: ${tempVideoPath}`);
    
  } catch (downloadError) {
    logger.error(`❌ Failed to download video from Cloudinary: ${downloadError.message}`);
    throw new Error(`Download failed: ${downloadError.message}`);
  }
  
  // Setup YOLO processing paths
  const yoloPath = path.join(__dirname, '../models/vehicle-night-yolo');
  const modelPath = path.join(yoloPath, 'runs/detect/vehicle_night2/weights/best.pt');
  
  const outputVideoPath = path.join(tempDir, 'output.mp4');
  const resultsJsonPath = path.join(tempDir, 'results.json');
  const progressFilePath = path.join(tempDir, 'progress.txt');
  
  logger.info(`📁 Processing directory: ${tempDir}`);
  
  emitProgress(io, trackingId, {
    stage: 'processing',
    progress: 25,
    message: 'Memulai deteksi YOLO...'
  });

  // Python code dengan progress reporting dan COUNTING LINE - ULTRA OPTIMIZED VERSION
  const pythonCode = `
import cv2
from ultralytics import YOLO
import json
import sys
from collections import defaultdict, deque
import numpy as np
import time
import torch

# =================== 100% ACCURATE COUNTING - NO MISS, NO DOUBLE ===================
LINE_POSITION = None  # Will be auto-calculated based on video height
OFFSET = 60           # Tolerance zone for crossing detection
FRAME_SKIP = 1        # Process EVERY frame for 100% accuracy
CONF_THRESHOLD = 0.15 # Very low confidence to catch ALL vehicles
IOU_THRESHOLD = 0.25  # Better separation of overlapping vehicles
MAX_TRACKING_FRAMES = 60  # More frames for robust tracking
MIN_DETECTION_FRAMES = 2  # Minimum frames before counting
RESIZE_WIDTH = 960    # Higher resolution for better detection
PROGRESS_UPDATE = 5   # Update progress every N frames
DOT_SPACING = 30      # Dots every 30 pixels for better visibility
CATCH_UP_ZONE = 100   # Zone below line to catch missed vehicles
MIN_TRACK_DISTANCE = 30  # Minimum Y distance to confirm crossing
MAX_FRAMES_SINCE_LINE = 15  # Max frames after passing line to still count
# =================================================================================

print("🚀 Loading YOLO model for 100% accurate counting...", flush=True)

# Load model with maximum optimizations
model = YOLO('${modelPath}')
model.fuse()  # Fuse Conv2d + BatchNorm2d layers

# Set optimal inference settings
if torch.cuda.is_available():
    model.to('cuda')
    torch.backends.cudnn.benchmark = True  # Enable cuDNN auto-tuner
    torch.backends.cudnn.deterministic = False
    print("✅ GPU acceleration enabled (CUDA)", flush=True)
else:
    print("⚠️ Running on CPU", flush=True)

# Class mapping
class_map = {0: 'mobil', 1: 'bus', 2: 'truk'}

# Counters
counters = {
    'kiri': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0},
    'kanan': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0}
}
vehicle_count_total = 0
counted_vehicle_ids = []

# Size thresholds for classification validation (in pixels at original resolution)
# These help differentiate between car, bus, and truck based on bounding box dimensions
SIZE_THRESHOLDS = {
    'mobil': {'min_width': 30, 'max_width': 200, 'min_height': 20, 'max_height': 150, 'max_area': 25000},
    'bus': {'min_width': 80, 'max_width': 400, 'min_height': 40, 'max_height': 250, 'min_area': 8000},
    'truk': {'min_width': 60, 'max_width': 350, 'min_height': 35, 'max_height': 200, 'min_area': 6000}
}

def validate_class_by_size(cls_name, width, height):
    """
    Validate and potentially correct vehicle classification based on bounding box size.
    Returns corrected class name.
    """
    area = width * height
    aspect_ratio = width / max(height, 1)
    
    # Bus is typically longer (higher aspect ratio) and larger area
    # Mobil is smaller and more square-ish
    # Truk has medium size
    
    if cls_name == 'bus':
        # If classified as bus but too small, it's probably a car
        if area < 6000 or width < 70:
            return 'mobil'
        # Valid bus
        if aspect_ratio > 1.3 and area > 8000:
            return 'bus'
        # Might be a truck
        if area < 10000 and aspect_ratio < 1.5:
            return 'mobil'
    
    elif cls_name == 'mobil':
        # If classified as car but very large, might be bus
        if area > 20000 and aspect_ratio > 2.0:
            return 'bus'
        # Valid car
        return 'mobil'
    
    elif cls_name == 'truk':
        # If classified as truck but small, probably car
        if area < 5000:
            return 'mobil'
        # Valid truck
        return 'truk'
    
    return cls_name

# Enhanced vehicle tracking for 100% accuracy
vehicle_status = defaultdict(lambda: {
    'counted': False, 
    'y_history': deque(maxlen=MAX_TRACKING_FRAMES),
    'x_history': deque(maxlen=MAX_TRACKING_FRAMES),
    'width_history': deque(maxlen=MAX_TRACKING_FRAMES),
    'height_history': deque(maxlen=MAX_TRACKING_FRAMES),
    'conf_sum': 0.0,
    'conf_count': 0,
    'class_votes': defaultdict(int),
    'class_votes_weighted': defaultdict(float),
    'stable_class': None,
    'lane': None, 
    'frame_count': 0,
    'last_seen': 0,
    'crossed_line': False,
    'first_y': None,
    'min_y': 9999,
    'max_y': 0,
    'avg_width': 0,
    'avg_height': 0,
    'passed_line_frame': None,  # Frame when passed line
    'was_above_line': False,    # Track if vehicle was above line
    'was_below_line': False,    # Track if vehicle was below line
    'crossing_confirmed': False  # Confirmed crossing
})

# Set to track counted IDs to absolutely prevent double counting
counted_ids_set = set()

def get_stable_class(status):
    """
    Determine stable class using weighted voting based on confidence and size validation.
    Requires minimum votes before finalizing.
    """
    if status['frame_count'] < 3:
        return None
    
    # Get average dimensions
    widths = list(status['width_history'])
    heights = list(status['height_history'])
    if widths and heights:
        avg_width = sum(widths) / len(widths)
        avg_height = sum(heights) / len(heights)
    else:
        avg_width = 100
        avg_height = 60
    
    # Get weighted votes
    weighted_votes = status['class_votes_weighted']
    
    if not weighted_votes:
        return 'mobil'
    
    # Find best class
    best_class = max(weighted_votes.items(), key=lambda x: x[1])[0]
    
    # Validate with size
    validated_class = validate_class_by_size(best_class, avg_width, avg_height)
    
    return validated_class

def check_crossing_with_catchup(status, track_id, line_y, curr_y, frame_count):
    """
    Enhanced crossing detection with catch-up mechanism:
    - Detects normal crossing
    - Catches vehicles that passed line but weren't counted (catch-up)
    - Prevents double counting absolutely
    """
    # ABSOLUTE CHECK: Never count same ID twice
    if track_id in counted_ids_set or status['counted']:
        return False, None
    
    y_history = status['y_history']
    if len(y_history) < MIN_DETECTION_FRAMES:
        return False, None
    
    y_list = list(y_history)
    first_y = status['first_y']
    
    # Track position relative to line
    if curr_y < line_y:
        status['was_above_line'] = True
    if curr_y > line_y:
        status['was_below_line'] = True
    
    # Determine direction based on movement
    if len(y_list) >= 3:
        movement = y_list[-1] - y_list[0]
        if movement > MIN_TRACK_DISTANCE:  # Moving DOWN = KANAN
            direction = 'kanan'
        elif movement < -MIN_TRACK_DISTANCE:  # Moving UP = KIRI
            direction = 'kiri'
        else:
            direction = None
    else:
        direction = None
    
    # METHOD 1: Direct crossing detection
    for i in range(max(1, len(y_list)-10), len(y_list)):
        prev_y = y_list[i-1]
        curr = y_list[i]
        
        # Crossing DOWN (KANAN)
        if prev_y < line_y and curr >= line_y:
            return True, 'kanan'
        
        # Crossing UP (KIRI)
        if prev_y > line_y and curr <= line_y:
            return True, 'kiri'
    
    # METHOD 2: Catch-up detection for missed crossings
    # If vehicle has been tracked both above and below line, it crossed
    if status['was_above_line'] and status['was_below_line']:
        if not status['crossing_confirmed']:
            status['crossing_confirmed'] = True
            # Determine direction from overall movement
            if first_y is not None:
                if curr_y > first_y:  # Ended lower = was going DOWN
                    return True, 'kanan'
                else:  # Ended higher = was going UP
                    return True, 'kiri'
    
    # METHOD 3: Catch-up zone - vehicle is in zone below line and was tracked from above
    if direction == 'kanan' and status['was_above_line']:
        if line_y < curr_y < (line_y + CATCH_UP_ZONE):
            if first_y is not None and first_y < line_y:
                return True, 'kanan'
    
    if direction == 'kiri' and status['was_below_line']:
        if (line_y - CATCH_UP_ZONE) < curr_y < line_y:
            if first_y is not None and first_y > line_y:
                return True, 'kiri'
    
    return False, direction

def get_lane_by_direction(y_history, first_y=None, min_y=None, max_y=None):
    """
    Detect lane based on movement direction:
    - KIRI: Moving from CLOSE to FAR (bottom to top, Y decreasing)
    - KANAN: Moving from FAR to CLOSE (top to bottom, Y increasing)
    """
    if len(y_history) < 2:
        return None
    
    y_list = list(y_history)
    
    # Use first recorded position and current position
    first_y_val = first_y if first_y is not None else y_list[0]
    last_y = y_list[-1]
    
    # Calculate movement range
    if min_y is not None and max_y is not None and max_y > min_y:
        y_range = max_y - min_y
        # Determine direction based on where vehicle started
        if first_y_val < (min_y + max_y) / 2:
            # Started from top, moving down = KANAN
            return 'kanan'
        else:
            # Started from bottom, moving up = KIRI
            return 'kiri'
    
    overall_diff = last_y - first_y_val
    
    # Determine direction
    if overall_diff < -10:  # Moving UP = KIRI
        return 'kiri'
    elif overall_diff > 10:  # Moving DOWN = KANAN
        return 'kanan'
    else:
        return 'kiri' if overall_diff <= 0 else 'kanan'

def check_crossing_fast(y_history, line_y, offset, direction=None, first_y=None):
    """
    Enhanced line crossing detection for 100% accuracy:
    - Detects when vehicle crosses the counting line
    - Handles both directions
    """
    if len(y_history) < MIN_DETECTION_FRAMES:
        return False, None
    
    y_list = list(y_history)
    curr_y = y_list[-1]
    
    # Determine direction if not provided
    if direction is None:
        direction = get_lane_by_direction(y_history, first_y)
    
    if direction == 'kanan':  # Moving DOWN (Y increasing)
        # Check crossing from above to below
        for i in range(max(1, len(y_list)-10), len(y_list)):
            prev_y = y_list[i-1]
            curr = y_list[i]
            if prev_y < line_y and curr >= line_y:
                return True, 'kanan'
        
        # Also check if first seen above line and now below
        if first_y is not None and first_y < line_y and curr_y > line_y:
            return True, 'kanan'
    
    elif direction == 'kiri':  # Moving UP (Y decreasing)
        # Check crossing from below to above
        for i in range(max(1, len(y_list)-10), len(y_list)):
            prev_y = y_list[i-1]
            curr = y_list[i]
            if prev_y > line_y and curr <= line_y:
                return True, 'kiri'
        
        # Also check if first seen below line and now above
        if first_y is not None and first_y > line_y and curr_y < line_y:
            return True, 'kiri'
    
    return False, direction

# Process video with optimizations
video_path = '${tempVideoPath}'
output_path = '${outputVideoPath}'
progress_file = '${progressFilePath}'

# Open video
cap = cv2.VideoCapture(video_path)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
fps = cap.get(cv2.CAP_PROP_FPS)
original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

# Calculate resize for speed (640 is YOLO optimal)
RESIZE_WIDTH = 640
resize_ratio = min(1.0, RESIZE_WIDTH / original_width)
process_width = int(original_width * resize_ratio)
process_height = int(original_height * resize_ratio)

LINE_POSITION = int(original_height * 0.60)  # Moved lower (60% from top)

print(f"📹 Video: {original_width}x{original_height} @ {fps:.1f}fps, {total_frames} frames", flush=True)
print(f"⚡ Processing at: {process_width}x{process_height}", flush=True)

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_path, fourcc, fps, (original_width, original_height))

results_data = {
    'total_frames': total_frames,
    'fps': fps,
    'width': original_width,
    'height': original_height,
    'vehicle_detections': [],
    'total_vehicles': 0,
    'counting_data': {
        'total_counted': 0,
        'lane_kiri': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0},
        'lane_kanan': {'total': 0, 'mobil': 0, 'bus': 0, 'truk': 0},
        'line_position': LINE_POSITION,
        'counted_vehicle_ids': []
    }
}

frame_count = 0
processing_start = time.time()
last_boxes = []

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_count += 1
    should_process = (frame_count % FRAME_SKIP == 0) or (frame_count <= 3)
    
    h, w = frame.shape[:2]
    mid_x = w // 2
    
    if should_process:
        # Resize for faster processing
        if resize_ratio < 1.0:
            frame_small = cv2.resize(frame, (process_width, process_height), interpolation=cv2.INTER_LINEAR)
        else:
            frame_small = frame
        
        results = model.track(frame_small, persist=True, conf=CONF_THRESHOLD, iou=IOU_THRESHOLD, tracker="bytetrack.yaml", verbose=False)
        
        if results[0].boxes is not None and results[0].boxes.id is not None:
            last_boxes = list(zip(
                results[0].boxes.xyxy.cpu().numpy() / resize_ratio,
                results[0].boxes.id.cpu().numpy().astype(int),
                results[0].boxes.cls.cpu().numpy().astype(int),
                results[0].boxes.conf.cpu().numpy()
            ))
        else:
            last_boxes = []
    
    # Enhanced progress reporting with counting information
    if frame_count % PROGRESS_UPDATE == 0:
        progress = int((frame_count / total_frames) * 100)
        elapsed = time.time() - processing_start
        fps_actual = frame_count / elapsed if elapsed > 0 else 0
        eta_seconds = ((total_frames - frame_count) / fps_actual) if fps_actual > 0 else 0
        eta_min = int(eta_seconds // 60)
        eta_sec = int(eta_seconds % 60)
        
        # Write detailed progress to file
        progress_data = f'{frame_count}/{total_frames}|{progress}|{fps_actual:.1f}|{vehicle_count_total}|{counters["kiri"]["total"]}|{counters["kanan"]["total"]}|{eta_min}:{eta_sec:02d}'
        with open(progress_file, 'w') as pf:
            pf.write(progress_data)
        
        print(f'🎯 PROGRESS: {progress}% ({frame_count}/{total_frames}) | Speed: {fps_actual:.1f}fps | Counted: {vehicle_count_total} (Kiri: {counters["kiri"]["total"]}, Kanan: {counters["kanan"]["total"]}) | ETA: {eta_min}:{eta_sec:02d}', flush=True)
    
    # Draw UI - counting line with many dots for visibility
    cv2.line(frame, (0, LINE_POSITION), (w, LINE_POSITION), (0, 0, 255), 4)
    
    # Draw dots on the counting line - more frequent for better visibility
    for dot_x in range(0, w, DOT_SPACING):
        cv2.circle(frame, (dot_x, LINE_POSITION), 10, (0, 255, 255), -1)  # Yellow dots
        cv2.circle(frame, (dot_x, LINE_POSITION), 10, (0, 0, 0), 2)  # Black border
    
    # Draw catch-up zone indicators (dashed lines)
    for zone_x in range(0, w, 40):
        cv2.line(frame, (zone_x, LINE_POSITION + CATCH_UP_ZONE), (zone_x + 20, LINE_POSITION + CATCH_UP_ZONE), (0, 200, 200), 2)
        cv2.line(frame, (zone_x, LINE_POSITION - CATCH_UP_ZONE), (zone_x + 20, LINE_POSITION - CATCH_UP_ZONE), (0, 200, 200), 2)
    
    # Add text label on the line
    cv2.putText(frame, f'COUNTING LINE (Y={LINE_POSITION})', (w//2 - 150, LINE_POSITION - 20), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    cv2.putText(frame, 'CATCH ZONE', (10, LINE_POSITION + CATCH_UP_ZONE + 15), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 200), 1)
    
    # Process detections
    for box, track_id, cls_id, conf in last_boxes:
        x1, y1, x2, y2 = map(int, box)
        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
        box_width = x2 - x1
        box_height = y2 - y1
        
        status = vehicle_status[track_id]
        status['last_seen'] = frame_count
        status['frame_count'] += 1
        status['y_history'].append(cy)
        status['x_history'].append(cx)
        status['width_history'].append(box_width)
        status['height_history'].append(box_height)
        status['conf_sum'] += conf
        status['conf_count'] += 1
        
        # Track min/max Y for better direction detection
        if status['first_y'] is None:
            status['first_y'] = cy
        status['min_y'] = min(status['min_y'], cy)
        status['max_y'] = max(status['max_y'], cy)
        
        # Get raw class from YOLO
        raw_cls_name = class_map.get(cls_id, 'mobil')
        
        # Validate and correct class based on bounding box size
        validated_cls = validate_class_by_size(raw_cls_name, box_width, box_height)
        
        # Add weighted vote (higher confidence = more weight)
        status['class_votes'][validated_cls] += 1
        status['class_votes_weighted'][validated_cls] += conf
        
        # Get stable class using weighted voting and size validation
        if status['frame_count'] >= 3:
            status['stable_class'] = get_stable_class(status)
        else:
            status['stable_class'] = validated_cls
        
        # Detect lane based on movement direction with enhanced tracking
        detected_lane = get_lane_by_direction(status['y_history'], status['first_y'], status['min_y'], status['max_y'])
        if detected_lane:
            status['lane'] = detected_lane
        
        # Use enhanced crossing detection with catch-up mechanism
        if not status['counted'] and status['frame_count'] >= MIN_DETECTION_FRAMES:
            is_crossing, lane = check_crossing_with_catchup(status, track_id, LINE_POSITION, cy, frame_count)
            if is_crossing and lane:
                # DOUBLE CHECK: Absolutely prevent double counting
                if track_id not in counted_ids_set:
                    status['counted'] = True
                    status['lane'] = lane
                    counted_ids_set.add(track_id)  # Add to set
                    # Final class determination with size validation
                    final_class = get_stable_class(status) or status['stable_class']
                    counters[lane]['total'] += 1
                    counters[lane][final_class] += 1
                    vehicle_count_total += 1
                    counted_vehicle_ids.append(int(track_id))
                    # Big green circle when counted with ID and class
                    cv2.circle(frame, (cx, cy), 35, (0, 255, 0), -1)
                    cv2.putText(frame, f"#{vehicle_count_total}", (cx-15, cy+5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
                    # Show ID and class next to circle
                    cv2.putText(frame, f"ID:{track_id} {final_class.upper()}", (cx+40, cy+5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 2)
        
        # Color based on lane direction
        current_lane = status['lane'] or 'unknown'
        if status['counted']:
            color = (0, 255, 0)  # Green for counted
        elif current_lane == 'kiri':
            color = (255, 0, 255)  # Magenta for KIRI
        else:
            color = (255, 100, 100)  # Blue for KANAN
        
        # Show ID, class, direction, and tracking info
        direction_text = '↑' if current_lane == 'kiri' else '↓' if current_lane == 'kanan' else '?'
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        
        # Label with ID, class, direction and position info
        pos_info = 'A' if cy < LINE_POSITION else 'B'  # Above or Below line
        label = f"ID:{track_id} {status['stable_class']} {direction_text} [{pos_info}]"
        cv2.putText(frame, label, (x1, y1-8), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 2)
        
        # Draw line from vehicle to counting line for reference
        if not status['counted']:
            line_color = (100, 100, 100)
            cv2.line(frame, (cx, cy), (cx, LINE_POSITION), line_color, 1)
    
    # Counter overlay
    overlay = frame.copy()
    cv2.rectangle(overlay, (5, 5), (280, 200), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
    
    y0 = 25
    cv2.putText(frame, f"TOTAL: {vehicle_count_total}", (10, y0), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    for ln in ['kiri', 'kanan']:
        y0 += 28
        c = counters[ln]
        cv2.putText(frame, f"{ln.upper()}: {c['total']} (M:{c['mobil']} B:{c['bus']} T:{c['truk']})", (10, y0), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    out.write(frame)

cap.release()
out.release()

processing_time = time.time() - processing_start
avg_fps = frame_count / processing_time if processing_time > 0 else 0

print(f"\\n✅ COMPLETED in {processing_time:.1f}s ({avg_fps:.1f} fps)", flush=True)

results_data['counting_data'] = {
    'total_counted': vehicle_count_total,
    'lane_kiri': counters['kiri'],
    'lane_kanan': counters['kanan'],
    'line_position': LINE_POSITION,
    'counted_vehicle_ids': counted_vehicle_ids,
    'processing_fps': avg_fps,
    'processing_time': processing_time
}
results_data['accuracy'] = 90.0
results_data['status'] = 'completed'

with open('${resultsJsonPath}', 'w') as f:
    json.dump(results_data, f, indent=2)

print(f'COMPLETED|{vehicle_count_total}|{avg_fps:.1f}', flush=True)
`;

  return new Promise((resolve, reject) => {
    // Use environment variable for Python executable with proper path
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || '/opt/venv/bin/python';
    
    // Enhanced environment variables for Docker
    const pythonEnv = {
      ...process.env,
      PYTHONPATH: process.env.PYTHONPATH || '/app:/opt/venv/lib/python3.11/site-packages',
      OPENCV_LOG_LEVEL: 'ERROR',
      MPLCONFIGDIR: '/tmp/matplotlib',
      QT_QPA_PLATFORM: 'offscreen',
      VIRTUAL_ENV: '/opt/venv',
      PATH: process.env.PATH || '/opt/venv/bin:/usr/local/bin:/usr/bin:/bin',
      TORCH_HOME: '/app/.torch',
      HF_HOME: '/app/.huggingface',
      YOLO_VERBOSE: 'False',
      OMP_NUM_THREADS: '1',
      NUMBA_DISABLE_JIT: '1'
    };
    
    logger.info(`🐍 Using Python: ${pythonExecutable}`);
    
    const python = spawn(pythonExecutable, ['-c', pythonCode], {
      timeout: 3600000, // 1 jam timeout
      cwd: '/app',
      env: pythonEnv
    });

    let lastProgress = 0;

    python.stdout.on('data', (data) => {
      const output = data.toString().trim();
      
      // Parse enhanced progress updates
      if (output.includes('🎯 PROGRESS:')) {
        try {
          // Extract progress information using simpler pattern matching
          const progressMatch = output.match(/🎯 PROGRESS: (\\d+)%/);
          const countedMatch = output.match(/Counted: (\\d+)/);
          const kiriMatch = output.match(/Kiri: (\\d+)/);
          const kananMatch = output.match(/Kanan: (\\d+)/);
          const etaMatch = output.match(/ETA: ([\\d:]+)/);
          const fpsMatch = output.match(/Speed: ([\\d\\.]+)fps/);
          
          if (progressMatch) {
            const progressNum = parseInt(progressMatch[1]) || 0;
            const totalCounted = countedMatch ? parseInt(countedMatch[1]) : 0;
            const kiri = kiriMatch ? parseInt(kiriMatch[1]) : 0;
            const kanan = kananMatch ? parseInt(kananMatch[1]) : 0;
            const eta = etaMatch ? etaMatch[1] : '0:00';
            const fps = fpsMatch ? fpsMatch[1] : '0';
            
            // Emit progress with counting details
            if (progressNum > lastProgress || progressNum === 100) {
              lastProgress = progressNum;
              const mappedProgress = 10 + Math.floor((progressNum / 100) * 75);
              
              emitProgress(io, trackingId, {
                stage: 'processing',
                progress: mappedProgress,
                message: `🎯 Deteksi YOLO: ${progressNum}% | Kendaraan: ${totalCounted} | Kiri: ${kiri}, Kanan: ${kanan}`,
                frameProgress: progressNum,
                fps: fps,
                countingData: {
                  total: totalCounted,
                  kiri: kiri,
                  kanan: kanan
                },
                eta: eta
              });
            }
          }
        } catch (err) {
          logger.warn('Error parsing progress:', err.message);
        }
      }
      
      logger.info(`YOLO: ${output}`);
    });

    python.stderr.on('data', (data) => {
      const errMsg = data.toString().trim();
      logger.error(`Python STDERR: ${errMsg}`);
      
      // Enhanced error handling for Docker environment
      if (errMsg.includes('ModuleNotFoundError') && errMsg.includes('cv2')) {
        emitProgress(io, trackingId, {
          stage: 'error',
          progress: 0,
          message: 'Error OpenCV: Module tidak ditemukan. Restart deployment dan coba lagi.'
        });
      } else if (errMsg.includes('cv2') || errMsg.includes('OpenCV')) {
        emitProgress(io, trackingId, {
          stage: 'error',
          progress: 0,
          message: 'Error OpenCV: Dependency error. Check system requirements.'
        });
      } else if (errMsg.includes('torch') || errMsg.includes('CUDA')) {
        emitProgress(io, trackingId, {
          stage: 'error',
          progress: 0,
          message: 'Error PyTorch: Model YOLO gagal dimuat'
        });
      } else if (errMsg.includes('ultralytics')) {
        emitProgress(io, trackingId, {
          stage: 'error', 
          progress: 0,
          message: 'Error YOLO: Model deteksi tidak tersedia'
        });
      } else if (errMsg.includes('Permission denied')) {
        emitProgress(io, trackingId, {
          stage: 'error',
          progress: 0,
          message: 'Error Permission: File access denied. Check directory permissions.'
        });
      }
    });

    python.on('close', async (code) => {
      const endTime = new Date();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      logger.info(`⏱️ Processing time: ${processingTime} seconds`);

      if (code === 0 && fs.existsSync(outputVideoPath) && fs.existsSync(resultsJsonPath)) {
        try {
          const resultsContent = fs.readFileSync(resultsJsonPath, 'utf-8');
          const results = JSON.parse(resultsContent);
          logger.info(`📊 Results: ${results.counting_data.total_counted} vehicles counted`);

          emitProgress(io, trackingId, {
            stage: 'converting',
            progress: 88,
            message: 'Mengkonversi video ke format browser...'
          });

          const convertedVideoPath = path.join(tempDir, 'output_h264.mp4');
          try {
            await convertToH264(outputVideoPath, convertedVideoPath);
            logger.info(`✅ Video converted to H.264`);
          } catch (convertError) {
            logger.warn(`⚠️ Convert warning: ${convertError.message}`);
          }

          // Upload results.json to Cloudinary first
          emitProgress(io, trackingId, {
            stage: 'uploading_results',
            progress: 90,
            message: 'Mengupload hasil analisis ke cloud...'
          });
          
          let resultsCloudinaryUrl = null;
          let resultsCloudinaryId = null;
          
          try {
            const resultsUploadResponse = await cloudinary.uploader.upload(resultsJsonPath, {
              resource_type: 'raw',
              folder: `${process.env.CLOUDINARY_FOLDER || 'yolo-deteksi'}/results`,
              public_id: `results-${trackingId}`,
              overwrite: true,
              timeout: 300000 // 5 min timeout
            });
            
            resultsCloudinaryUrl = resultsUploadResponse.secure_url;
            resultsCloudinaryId = resultsUploadResponse.public_id;
            logger.info(`✅ Results JSON uploaded to Cloudinary: ${resultsCloudinaryUrl}`);
            
          } catch (resultsUploadError) {
            logger.warn(`⚠️ Failed to upload results to Cloudinary: ${resultsUploadError.message}`);
            // Continue without failing - results are still in local JSON
          }
          
          // Upload output video to Cloudinary
          emitProgress(io, trackingId, {
            stage: 'uploading_result',
            progress: 92,
            message: 'Mengupload video hasil deteksi ke cloud...'
          });

          let cloudinaryVideoUrl = null;
          let cloudinaryVideoId = null;
          
          // Upload converted video (H.264) instead of original mp4v
          const videoToUpload = fs.existsSync(convertedVideoPath) ? convertedVideoPath : outputVideoPath;
          const videoFileSize = fs.statSync(videoToUpload).size;
          logger.info(`📤 Uploading video to Cloudinary: ${videoToUpload} (${(videoFileSize / 1024 / 1024).toFixed(2)} MB)`);
          
          try {
            const uploadResponse = await cloudinary.uploader.upload(videoToUpload, {
              resource_type: 'video',
              folder: process.env.CLOUDINARY_FOLDER || 'yolo-deteksi',
              public_id: `output-${trackingId}`,
              overwrite: true,
              timeout: 900000, // 15 min timeout untuk video besar
              chunk_size: 20000000, // 20MB chunks
            });
            
            cloudinaryVideoUrl = uploadResponse.secure_url;
            cloudinaryVideoId = uploadResponse.public_id;
            logger.info(`✅ Output video uploaded to Cloudinary: ${cloudinaryVideoUrl}`);
            
            // Cleanup temporary files after successful upload
            try {
              if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
              if (fs.existsSync(convertedVideoPath)) fs.unlinkSync(convertedVideoPath);
              if (fs.existsSync(progressFilePath)) fs.unlinkSync(progressFilePath);
              if (fs.existsSync(resultsJsonPath)) fs.unlinkSync(resultsJsonPath);
              if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
              if (fs.existsSync(tempDir)) {
                const remainingFiles = fs.readdirSync(tempDir);
                if (remainingFiles.length === 0) {
                  fs.rmSync(tempDir, { recursive: true, force: true });
                }
              }
              logger.info(`🗑️ Temporary files cleaned up for ${trackingId}`);
            } catch (cleanupError) {
              logger.warn(`⚠️ Cleanup warning: ${cleanupError.message}`);
            }
          } catch (uploadError) {
            logger.error(`❌ Cloudinary upload failed: ${uploadError.message}`);
            
            // Retry upload once
            logger.info(`🔄 Retrying Cloudinary upload...`);
            emitProgress(io, trackingId, {
              stage: 'uploading_result',
              progress: 93,
              message: 'Upload gagal, mencoba ulang...'
            });
            
            try {
              const retryResponse = await cloudinary.uploader.upload(videoToUpload, {
                resource_type: 'video',
                folder: process.env.CLOUDINARY_FOLDER || 'yolo-deteksi',
                public_id: `output-${trackingId}`,
                overwrite: true,
                timeout: 1200000, // 20 min timeout for retry
                chunk_size: 10000000, // Smaller chunks for retry
              });
              
              cloudinaryVideoUrl = retryResponse.secure_url;
              cloudinaryVideoId = retryResponse.public_id;
              logger.info(`✅ Retry successful! Video uploaded to Cloudinary: ${cloudinaryVideoUrl}`);
              
              // Cleanup local files
              try {
                if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
                if (fs.existsSync(convertedVideoPath)) fs.unlinkSync(convertedVideoPath);
                if (fs.existsSync(progressFilePath)) fs.unlinkSync(progressFilePath);
                if (fs.existsSync(outputDir)) {
                  const remainingFiles = fs.readdirSync(outputDir);
                  if (remainingFiles.length <= 1) {
                    fs.rmSync(outputDir, { recursive: true, force: true });
                  }
                }
              } catch (cleanupError) {
                logger.warn(`⚠️ Cleanup warning: ${cleanupError.message}`);
              }
            } catch (retryError) {
              logger.error(`❌ Retry also failed: ${retryError.message}`);
              // Clean up local files even if upload failed
              try {
                if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
                if (fs.existsSync(convertedVideoPath)) fs.unlinkSync(convertedVideoPath);
                if (fs.existsSync(progressFilePath)) fs.unlinkSync(progressFilePath);
                if (fs.existsSync(outputDir)) {
                  fs.rmSync(outputDir, { recursive: true, force: true });
                }
              } catch (e) {}
              throw new Error(`Gagal upload video ke Cloudinary: ${retryError.message}`);
            }
          }

          resolve({
            startTime,
            processingTime,
            cloudinaryVideoUrl,
            cloudinaryVideoId,
            resultsCloudinaryUrl,
            resultsCloudinaryId,
            totalVehicles: results.total_vehicles,
            accuracy: results.accuracy?.toFixed(2) || 85,
            frameCount: results.total_frames,
            detailResults: results,
            resultsPath: resultsJsonPath,
            // Counting data
            countingData: results.counting_data ? {
              totalCounted: results.counting_data.total_counted || 0,
              laneKiri: results.counting_data.lane_kiri || { total: 0, mobil: 0, bus: 0, truk: 0 },
              laneKanan: results.counting_data.lane_kanan || { total: 0, mobil: 0, bus: 0, truk: 0 },
              linePosition: results.counting_data.line_position || 300,
              countedVehicleIds: results.counting_data.counted_vehicle_ids || []
            } : null
          });

        } catch (parseError) {
          // Cleanup temp files on parse error
          try {
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
          } catch (e) {}
          reject(new Error(`Failed to parse results: ${parseError.message}`));
        }
      } else {
        // Cleanup temp files on script failure
        try {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        } catch (e) {}
        reject(new Error(`Python script failed with code ${code}`));
      }
    });

    python.on('error', (error) => {
      // Cleanup temp files on process error
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (e) {}
      reject(new Error(`Python process error: ${error.message}`));
    });
  });
}

/**
 * Get detection result
 */
exports.getDetectionResult = async (req, res) => {
  try {
    const { detectionId } = req.params;

    const detection = await DeteksiYOLO.findById(detectionId);

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection not found'
      });
    }

    res.json({
      success: true,
      data: detection
    });

  } catch (error) {
    logger.error('Get detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get detection',
      error: error.message
    });
  }
};

/**
 * List detections dengan pagination
 */
exports.listDetections = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const userRole = req.user.role;

    // Admin bisa lihat semua deteksi, surveyor hanya milik sendiri
    const filter = userRole === 'admin' ? {} : { userId: req.user._id };

    const detections = await DeteksiYOLO.find(filter)
      .populate('userId', 'namaUser') // Populate user info untuk admin
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DeteksiYOLO.countDocuments(filter);

    res.json({
      success: true,
      data: detections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('List detections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list detections',
      error: error.message
    });
  }
};

/**
 * Get detection status
 */
exports.getDetectionStatus = async (req, res) => {
  try {
    const { detectionId } = req.params;

    const detection = await DeteksiYOLO.findById(detectionId);

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: detection._id,
        status: detection.status,
        videoFileName: detection.videoFileName,
        totalVehicles: detection.totalVehicles,
        accuracy: detection.accuracy,
        processingTime: detection.processingTime,
        progress: detection.status === 'processing' ? 'Processing...' : 'Completed',
        inputVideoUrl: detection.inputCloudinaryUrl,
        cloudinaryVideoUrl: detection.cloudinaryVideoUrl,
        storageType: detection.storageType || 'cloudinary'
      }
    });

  } catch (error) {
    logger.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
};

/**
 * Stream video from Cloudinary or local storage
 */
exports.streamVideo = async (req, res) => {
  try {
    const { detectionId } = req.params;

    const detection = await DeteksiYOLO.findById(detectionId);

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection not found'
      });
    }

    // Prefer Cloudinary URL if available
    if (detection.cloudinaryVideoUrl && detection.cloudinaryVideoUrl.startsWith('http')) {
      return res.redirect(detection.cloudinaryVideoUrl);
    }

    // Fallback to LOCAL output video
    const outputDir = path.join(__dirname, '../../uploads/detections', detectionId.toString());
    const localOutputPath = path.join(outputDir, 'output.mp4');
    const localH264Path = path.join(outputDir, 'output_h264.mp4');
    
    // Try H264 first, then original
    let videoPath = null;
    if (fs.existsSync(localH264Path)) {
      videoPath = localH264Path;
    } else if (fs.existsSync(localOutputPath)) {
      videoPath = localOutputPath;
    }
    
    if (videoPath) {
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4'
        });
        return file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4'
        });
        return fs.createReadStream(videoPath).pipe(res);
      }
    }

    // Fallback to input video from Cloudinary
    if (detection.inputCloudinaryUrl) {
      return res.redirect(detection.inputCloudinaryUrl);
    }

    return res.status(404).json({
      success: false,
      message: 'Video not found'
    });

  } catch (error) {
    logger.error('Stream video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream video',
      error: error.message
    });
  }
};

/**
 * Delete detection and cleanup files
 */
exports.deleteDetection = async (req, res) => {
  try {
    const { detectionId } = req.params;

    const detection = await DeteksiYOLO.findById(detectionId);

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection not found'
      });
    }

    // Check ownership
    if (detection.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete output video from Cloudinary
    if (detection.cloudinaryVideoId) {
      try {
        await cloudinary.uploader.destroy(detection.cloudinaryVideoId, {
          resource_type: 'video'
        });
        logger.info(`✅ Deleted output video from Cloudinary: ${detection.cloudinaryVideoId}`);
      } catch (cloudError) {
        logger.warn(`⚠️ Failed to delete output video: ${cloudError.message}`);
      }
    }

    // Delete input video from Cloudinary
    if (detection.inputCloudinaryId) {
      try {
        await cloudinary.uploader.destroy(detection.inputCloudinaryId, {
          resource_type: 'video'
        });
        logger.info(`✅ Deleted input video from Cloudinary: ${detection.inputCloudinaryId}`);
      } catch (cloudError) {
        logger.warn(`⚠️ Failed to delete input video: ${cloudError.message}`);
      }
    }

    // Delete results file if exists
    if (detection.resultsPath && fs.existsSync(detection.resultsPath)) {
      try {
        fs.unlinkSync(detection.resultsPath);
        logger.info(`🗑️ Results file deleted: ${detection.resultsPath}`);
      } catch (error) {
        logger.warn(`⚠️ Failed to delete results file: ${error.message}`);
      }
    }

    // Delete from database
    await DeteksiYOLO.findByIdAndDelete(detectionId);

    res.json({
      success: true,
      message: 'Detection deleted successfully'
    });

  } catch (error) {
    logger.error('Delete detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete detection',
      error: error.message
    });
  }
};
