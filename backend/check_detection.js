const mongoose = require('mongoose');
const DeteksiYOLO = require('./src/models/DeteksiYOLO');
require('dotenv').config();

async function checkDetection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const detectionId = '695355b8862578b784ae83b7';
        console.log('Checking detection ID:', detectionId);
        
        const detection = await DeteksiYOLO.findById(detectionId);
        
        if (detection) {
            console.log('Detection found:');
            console.log('Status:', detection.status);
            console.log('Start Time:', detection.startTime);
            console.log('End Time:', detection.endTime);
            console.log('Total Vehicles:', detection.totalVehicles);
            console.log('Accuracy:', detection.accuracy);
            console.log('Output Video Path:', detection.outputVideoPath);
            console.log('Cloudinary URL:', detection.cloudinaryVideoUrl);
            console.log('Processing Time:', detection.processingTime);
        } else {
            console.log('Detection not found in database');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDetection();