const mongoose = require('mongoose');
const DeteksiYOLO = require('./src/models/DeteksiYOLO');
const cloudinary = require('./src/config/cloudinary');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixCompletedDetections() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Check uploads/detections folder
        const uploadsDir = path.join(__dirname, 'uploads/detections');
        
        if (!fs.existsSync(uploadsDir)) {
            console.log('No uploads/detections folder found');
            process.exit(0);
        }
        
        const folders = fs.readdirSync(uploadsDir);
        console.log(`Found ${folders.length} detection folders`);
        
        for (const folder of folders) {
            const folderPath = path.join(uploadsDir, folder);
            const outputVideoPath = path.join(folderPath, 'output.mp4');
            const resultsJsonPath = path.join(folderPath, 'results.json');
            
            // Check if processing is complete (both files exist)
            if (fs.existsSync(outputVideoPath) && fs.existsSync(resultsJsonPath)) {
                console.log(`\\nProcessing completed detection: ${folder}`);
                
                // Check if record exists in database
                const detection = await DeteksiYOLO.findById(folder);
                
                if (!detection) {
                    console.log(`  ❌ No database record found for ${folder} - skipping`);
                    continue;
                }
                
                if (detection.status === 'completed') {
                    console.log(`  ✅ Already marked as completed - skipping`);
                    continue;
                }
                
                console.log(`  🔄 Updating status from ${detection.status} to completed`);
                
                // Read results.json
                const resultsContent = fs.readFileSync(resultsJsonPath, 'utf-8');
                const results = JSON.parse(resultsContent);
                
                // Calculate processing time
                const startTime = detection.startTime ? new Date(detection.startTime) : new Date();
                const endTime = new Date();
                const processingTime = Math.round((endTime - startTime) / 1000);
                
                console.log(`  📊 Total vehicles: ${results.total_vehicles}`);
                console.log(`  📊 Accuracy: ${results.accuracy.toFixed(2)}%`);
                console.log(`  📊 Processing time: ${processingTime}s`);
                
                // Upload to Cloudinary if not already uploaded
                let cloudinaryVideoUrl = detection.cloudinaryVideoUrl;
                let cloudinaryVideoId = detection.cloudinaryVideoId;
                
                if (!cloudinaryVideoUrl) {
                    console.log(`  📤 Uploading to Cloudinary...`);
                    try {
                        const uploadResponse = await cloudinary.uploader.upload(outputVideoPath, {
                            resource_type: 'video',
                            folder: process.env.CLOUDINARY_FOLDER || 'yolo-deteksi',
                            public_id: `output-${folder}`,
                            overwrite: true,
                            timeout: 600000,
                            quality: 'auto',
                            transformation: {
                                quality: 'auto:good',
                                fetch_format: 'auto'
                            }
                        });
                        
                        cloudinaryVideoUrl = uploadResponse.secure_url;
                        cloudinaryVideoId = uploadResponse.public_id;
                        console.log(`  ✅ Uploaded to Cloudinary: ${cloudinaryVideoUrl}`);
                        
                        // Delete local video after successful upload
                        try {
                            fs.unlinkSync(outputVideoPath);
                            console.log(`  🗑️  Local video deleted`);
                        } catch (cleanupError) {
                            console.log(`  ⚠️  Failed to delete local video: ${cleanupError.message}`);
                        }
                        
                    } catch (cloudError) {
                        console.log(`  ❌ Cloudinary upload failed: ${cloudError.message}`);
                    }
                }
                
                // Update database record
                const updatedRecord = await DeteksiYOLO.findByIdAndUpdate(
                    folder,
                    {
                        status: 'completed',
                        outputVideoPath: cloudinaryVideoUrl || outputVideoPath,
                        resultsPath: resultsJsonPath,
                        totalVehicles: results.total_vehicles,
                        accuracy: results.accuracy.toFixed(2),
                        processingTime: processingTime.toFixed(2),
                        endTime: endTime,
                        frameCount: results.total_frames,
                        detailResults: results,
                        cloudinaryVideoUrl: cloudinaryVideoUrl,
                        cloudinaryVideoId: cloudinaryVideoId,
                        storageType: cloudinaryVideoUrl ? 'cloudinary' : 'local',
                        localFilesDeleted: cloudinaryVideoUrl ? true : false
                    },
                    { new: true }
                );
                
                if (updatedRecord) {
                    console.log(`  ✅ Database updated successfully`);
                } else {
                    console.log(`  ❌ Failed to update database`);
                }
            }
        }
        
        console.log('\\n🎉 Fix completed!');
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixCompletedDetections();