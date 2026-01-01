const mongoose = require('mongoose');
const DeteksiYOLO = require('./src/models/DeteksiYOLO');
require('dotenv').config();

async function checkAllDetections() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const detections = await DeteksiYOLO.find().sort({ createdAt: -1 }).limit(10);
        
        console.log(`Found ${detections.length} detection records:`);
        console.log('========================');
        
        detections.forEach((detection, index) => {
            console.log(`${index + 1}. ID: ${detection._id}`);
            console.log(`   Status: ${detection.status}`);
            console.log(`   Video: ${detection.videoFileName || 'N/A'}`);
            console.log(`   Start: ${detection.startTime}`);
            console.log(`   End: ${detection.endTime || 'N/A'}`);
            console.log(`   Total Vehicles: ${detection.totalVehicles || 0}`);
            console.log('   ---');
        });
        
        // Check folders in uploads/detections
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, 'uploads/detections');
        
        if (fs.existsSync(uploadsDir)) {
            const folders = fs.readdirSync(uploadsDir);
            console.log(`Detection folders found: ${folders.length}`);
            folders.forEach(folder => {
                console.log(`Folder: ${folder}`);
                const folderPath = path.join(uploadsDir, folder);
                const files = fs.readdirSync(folderPath);
                console.log(`  Files: ${files.join(', ')}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAllDetections();