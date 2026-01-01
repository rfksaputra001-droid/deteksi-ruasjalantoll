require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cloudinary = require('./src/config/cloudinary');
const DeteksiYOLO = require('./src/models/DeteksiYOLO');

async function createDetection(detectionId) {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const outputDir = path.join(__dirname, 'uploads/detections', detectionId);
  const localOutputPath = path.join(outputDir, 'output.mp4');
  const resultsPath = path.join(outputDir, 'results.json');

  if (!fs.existsSync(resultsPath)) {
    console.log('results.json not found');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  console.log('Results loaded:', results.total_frames, 'frames');

  // Get first user from database (admin)
  const User = require('./src/models/User');
  const user = await User.findOne({});
  if (!user) {
    console.log('No user found');
    process.exit(1);
  }
  console.log('Using user:', user.email);

  // Upload to Cloudinary first
  let cloudinaryVideoUrl = null;
  let cloudinaryVideoId = null;

  if (fs.existsSync(localOutputPath)) {
    console.log('\n📤 Uploading to Cloudinary...');
    const size = (fs.statSync(localOutputPath).size / 1024 / 1024).toFixed(2);
    console.log('File size:', size, 'MB');
    
    try {
      const uploadResponse = await cloudinary.uploader.upload(localOutputPath, {
        resource_type: 'video',
        folder: process.env.CLOUDINARY_FOLDER || 'yolo-deteksi',
        public_id: 'output-' + detectionId,
        overwrite: true,
        timeout: 900000,
        chunk_size: 20000000,
      });
      cloudinaryVideoUrl = uploadResponse.secure_url;
      cloudinaryVideoId = uploadResponse.public_id;
      console.log('✅ Uploaded:', cloudinaryVideoUrl);
    } catch (err) {
      console.error('❌ Upload error:', err.message);
    }
  }

  // Create record
  const detection = await DeteksiYOLO.create({
    _id: detectionId,
    userId: user._id,
    videoFileName: 'Restored Detection',
    videoSize: fs.existsSync(localOutputPath) ? fs.statSync(localOutputPath).size : 0,
    status: 'completed',
    cloudinaryVideoUrl: cloudinaryVideoUrl,
    cloudinaryVideoId: cloudinaryVideoId,
    totalVehicles: results.total_vehicles,
    accuracy: results.accuracy || 85,
    frameCount: results.total_frames,
    countingData: {
      totalCounted: results.counting_data?.total_counted || 0,
      laneKiri: results.counting_data?.lane_kiri,
      laneKanan: results.counting_data?.lane_kanan,
      linePosition: results.counting_data?.line_position,
      countedVehicleIds: results.counting_data?.counted_vehicle_ids || []
    }
  });

  console.log('✅ Detection created:', detection._id);

  await mongoose.disconnect();
}

const id = process.argv[2];
if (!id) {
  console.log('Usage: node create_detection_record.js <detectionId>');
  process.exit(1);
}
createDetection(id);
