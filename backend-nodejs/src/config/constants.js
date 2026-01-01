module.exports = {
    // User roles
    USER_ROLES: {
        ADMIN: 'admin',
        USER: 'user'
    },

    // Video processing status
    VIDEO_STATUS: {
        UPLOADED: 'UPLOADED',
        PROCESSING: 'PROCESSING',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED'
    },

    // Level of Service (LOS)
    LOS_LEVELS: ['A', 'B', 'C', 'D', 'E', 'F'],

    // Video settings
    VIDEO_SETTINGS: {
        MAX_SIZE: parseInt(process.env.MAX_VIDEO_SIZE) || 5 * 1024 * 1024 * 1024, // 5GB
        EXPIRY_DAYS: parseInt(process.env.VIDEO_EXPIRY_DAYS) || 7,
        QUALITY: process.env.VIDEO_QUALITY || '480p',
        ALLOWED_FORMATS: (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,avi,mov,mkv').split(',')
    },

    // YOLO settings
    YOLO_SETTINGS: {
        MODEL_VERSION: 'YOLOv8',
        MIN_CONFIDENCE: 0.25,
        CLASSES: ['mobil', 'motor']
    },

    // JWT settings
    JWT_SETTINGS: {
        SECRET: process.env.JWT_SECRET,
        EXPIRE: process.env.JWT_EXPIRE || '7d'
    },

    // Cloudinary settings
    CLOUDINARY_SETTINGS: {
        FOLDER: process.env.CLOUDINARY_FOLDER || 'yolo-videos',
        RESOURCE_TYPE: 'video',
        MAX_FILE_SIZE: 100 * 1024 * 1024 // 100MB per upload to Cloudinary
    }
};
