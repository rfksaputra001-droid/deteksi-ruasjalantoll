require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cloudinary = require('./src/config/cloudinary');
const DeteksiYOLO = require('./src/models/DeteksiYOLO');

async function fixDetection(detectionId) {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const detection = await DeteksiYOLO.findById(detectionId);
  if (!detection) {
    console.log('Detection not found');
    process.exit(1);
  }

  console.log('Detection:', detection._id);
  console.log('Status:', detection.status);
  console.log('Cloudinary URL:', detection.cloudinaryVideoUrl);

  // Check local files
  const outputDir = path.join(__dirname, 'uploads/detections', detectionId);
  const localOutputPath = path.join(outputDir, 'output.mp4');
  const localH264Path = path.join(outputDir, 'output_h264.mp4');
  const resultsPath = path.join(outputDir, 'results.json');

  console.log('\nLocal files:');
  console.log('- output.mp4:', fs.existsSync(localOutputPath) ? `${(fs.statSync(localOutputPath).size / 1024 / 1024).toFixed(2)} MB` : 'NOT FOUND');
  console.log('- output_h264.mp4:', fs.existsSync(localH264Path) ? `${(fs.statSync(localH264Path).size / 1024 / 1024).toFixed(2)} MB` : 'NOT FOUND');
  console.log('- results.json:', fs.existsSync(resultsPath) ? 'EXISTS' : 'NOT FOUND');

  // If no cloudinary URL but local file exists, upload now
  if (!detection.cloudinaryVideoUrl || !detection.cloudinaryVideoUrl.startsWith('http')) {
    const videoToUpload = fs.existsSync(localH264Path) ? localH264Path : (fs.existsSync(localOutputPath) ? localOutputPath : null);
    
    if (videoToUpload) {
      console.log('\n📤 Uploading to Cloudinary:', videoToUpload);
      
      try {
        const uploadResponse = await cloudinary.uploader.upload(videoToUpload, {
          resource_type: 'video',
          folder: process.env.CLOUDINARY_FOLDER || 'yolo-deteksi',
          public_id: `output-${detectionId}`,
          overwrite: true,
          timeout: 900000,
          chunk_size: 20000000,
        });
        
        console.log('✅ Uploaded:', uploadResponse.secure_url);
        
        // Update database
        detection.cloudinaryVideoUrl = uploadResponse.secure_url;
        detection.cloudinaryVideoId = uploadResponse.public_id;
        detection.status = 'completed';
        await detection.save();
        
        console.log('✅ Database updated');
      } catch (err) {
        console.error('❌ Upload error:', err.message);
      }
    }
  }

  // Update with results data if missing
  if (fs.existsSync(resultsPath) && !detection.countingData) {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    detection.countingData = {
      totalCounted: results.counting_data?.total_counted || 0,
      laneKiri: results.counting_data?.lane_kiri || { total: 0, mobil: 0, bus: 0, truk: 0 },
      laneKanan: results.counting_data?.lane_kanan || { total: 0, mobil: 0, bus: 0, truk: 0 },
      linePosition: results.counting_data?.line_position || 300,
      countedVehicleIds: results.counting_data?.counted_vehicle_ids || []
    };
    detection.totalVehicles = results.total_vehicles;
    detection.accuracy = results.accuracy || 85;
    detection.frameCount = results.total_frames;
    await detection.save();
    console.log('✅ Results data updated');
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

// Run with latest detection
const id = process.argv[2] || '6954cd36becb3ecd82a790bd';
fixDetection(id);
