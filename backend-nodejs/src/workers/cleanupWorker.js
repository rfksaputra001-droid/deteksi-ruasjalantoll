const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');
const DeteksiYOLO = require('../models/DeteksiYOLO');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const startCleanupWorker = () => {
    // Run every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
        logger.info('🧹 Starting comprehensive cleanup job...');

        try {
            await cleanupExpiredVideos();
            await cleanupOldDetections();
            await cleanupOrphanedFiles();
            await cleanupCloudinaryOrphans();

            logger.info('✅ Comprehensive cleanup job completed');

        } catch (error) {
            logger.error('❌ Cleanup job failed:', error);
        }
    });

    // Also run cleanup for processing failed detections every hour
    cron.schedule('0 * * * *', async () => {
        try {
            await cleanupFailedProcessing();
        } catch (error) {
            logger.error('❌ Failed processing cleanup failed:', error);
        }
    });

    logger.info('🕐 Cleanup worker started (daily at 2 AM + hourly failed processing cleanup)');
};

// Clean up expired videos (original Video model)
const cleanupExpiredVideos = async () => {
    logger.info('🗑️  Cleaning up expired videos...');
    
    const expiredVideos = await Video.find({
        expiresAt: { $lt: new Date() },
        isDeleted: false
    });

    logger.info(`Found ${expiredVideos.length} expired videos`);

    for (const video of expiredVideos) {
        try {
            // Delete from Cloudinary
            if (video.cloudinaryId) {
                await cloudinary.uploader.destroy(video.cloudinaryId, {
                    resource_type: 'video'
                });
                logger.info(`Deleted video from Cloudinary: ${video.cloudinaryId}`);
            }

            // Mark as deleted (soft delete)
            video.isDeleted = true;
            await video.save();

            logger.info(`Marked video as deleted: ${video._id}`);

        } catch (error) {
            logger.error(`Error deleting video ${video._id}:`, error);
        }
    }
};

// Clean up old detection records and files (older than 30 days)
const cleanupOldDetections = async () => {
    logger.info('🗑️  Cleaning up old detection records...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldDetections = await DeteksiYOLO.find({
        createdAt: { $lt: thirtyDaysAgo },
        status: 'completed'
    });

    logger.info(`Found ${oldDetections.length} old completed detections to cleanup`);

    for (const detection of oldDetections) {
        try {
            // Delete from Cloudinary if exists
            if (detection.cloudinaryVideoId) {
                try {
                    await cloudinary.uploader.destroy(detection.cloudinaryVideoId, {
                        resource_type: 'video'
                    });
                    logger.info(`Deleted old detection video from Cloudinary: ${detection.cloudinaryVideoId}`);
                } catch (cloudError) {
                    logger.warn(`Failed to delete from Cloudinary: ${cloudError.message}`);
                }
            }

            // Delete local files if they still exist
            if (detection.outputVideoPath && fs.existsSync(detection.outputVideoPath)) {
                fs.unlinkSync(detection.outputVideoPath);
                logger.info(`Deleted local video: ${detection.outputVideoPath}`);
            }

            if (detection.resultsPath && fs.existsSync(detection.resultsPath)) {
                fs.unlinkSync(detection.resultsPath);
                logger.info(`Deleted results file: ${detection.resultsPath}`);
            }

            // Remove detection directory if empty
            const detectionDir = path.dirname(detection.resultsPath || detection.outputVideoPath || '');
            if (detectionDir && fs.existsSync(detectionDir)) {
                try {
                    const files = fs.readdirSync(detectionDir);
                    if (files.length === 0) {
                        fs.rmdirSync(detectionDir);
                        logger.info(`Removed empty detection directory: ${detectionDir}`);
                    }
                } catch (dirError) {
                    logger.warn(`Failed to remove directory: ${dirError.message}`);
                }
            }

            // Delete from database
            await DeteksiYOLO.findByIdAndDelete(detection._id);
            logger.info(`Deleted old detection record: ${detection._id}`);

        } catch (error) {
            logger.error(`Error cleaning up detection ${detection._id}:`, error);
        }
    }
};

// Clean up orphaned local files
const cleanupOrphanedFiles = async () => {
    logger.info('🗑️  Cleaning up orphaned local files...');
    
    const uploadsDir = path.join(__dirname, '../../uploads');
    const detectionsDir = path.join(uploadsDir, 'detections');
    
    if (!fs.existsSync(detectionsDir)) return;

    const detectionFolders = fs.readdirSync(detectionsDir);
    
    for (const folder of detectionFolders) {
        const folderPath = path.join(detectionsDir, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        // Check if detection record exists in database
        const detection = await DeteksiYOLO.findById(folder);
        
        if (!detection) {
            // Orphaned folder - delete it
            try {
                fs.rmSync(folderPath, { recursive: true, force: true });
                logger.info(`Deleted orphaned detection folder: ${folderPath}`);
            } catch (error) {
                logger.warn(`Failed to delete orphaned folder: ${error.message}`);
            }
        }
    }
};

// Clean up orphaned files on Cloudinary (videos without corresponding database records)
const cleanupCloudinaryOrphans = async () => {
    logger.info('🗑️  Checking for orphaned Cloudinary videos...');
    
    try {
        // Get all videos in the yolo-deteksi folder
        const result = await cloudinary.search
            .expression(`folder:${process.env.CLOUDINARY_FOLDER || 'yolo-deteksi'}`)
            .with_field('context')
            .max_results(500) // Adjust as needed
            .execute();

        logger.info(`Found ${result.resources.length} videos in Cloudinary`);

        for (const resource of result.resources) {
            // Extract detection ID from public_id (format: output-{detectionId})
            const publicId = resource.public_id;
            const match = publicId.match(/output-(.+)$/);
            
            if (match) {
                const detectionId = match[1];
                const detection = await DeteksiYOLO.findById(detectionId);
                
                if (!detection) {
                    // Orphaned video in Cloudinary
                    try {
                        await cloudinary.uploader.destroy(publicId, {
                            resource_type: 'video'
                        });
                        logger.info(`Deleted orphaned Cloudinary video: ${publicId}`);
                    } catch (error) {
                        logger.warn(`Failed to delete orphaned Cloudinary video: ${error.message}`);
                    }
                }
            }
        }
    } catch (error) {
        logger.warn(`Failed to cleanup Cloudinary orphans: ${error.message}`);
    }
};

// Clean up failed/stuck processing detections
const cleanupFailedProcessing = async () => {
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const stuckDetections = await DeteksiYOLO.find({
        status: 'processing',
        startTime: { $lt: sixHoursAgo }
    });

    logger.info(`Found ${stuckDetections.length} stuck processing detections`);

    for (const detection of stuckDetections) {
        try {
            // Update status to failed
            detection.status = 'failed';
            detection.error = 'Processing timeout - cleaned up by worker';
            detection.endTime = new Date();
            await detection.save();

            // Clean up any local files
            if (detection.videoPath && fs.existsSync(detection.videoPath)) {
                fs.unlinkSync(detection.videoPath);
            }

            logger.info(`Marked stuck detection as failed: ${detection._id}`);
        } catch (error) {
            logger.error(`Error cleaning up stuck detection ${detection._id}:`, error);
        }
    }
};

module.exports = { startCleanupWorker };
