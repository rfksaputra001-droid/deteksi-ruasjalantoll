const mongoose = require('mongoose');

const deteksiSchema = new mongoose.Schema({
    idVideo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        sparse: true, // Make it optional
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true
    },
    videoPath: {
        type: String,
        sparse: true
    },
    videoFileName: {
        type: String,
        sparse: true
    },
    videoSize: {
        type: Number,
        sparse: true
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    modelVersion: {
        type: String,
        default: 'YOLOv8'
    },
    confidence: {
        type: Number,
        default: 0.5,
        min: 0,
        max: 1
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    // Detection details
    detectionData: {
        totalFrames: {
            type: Number,
            default: 0
        },
        processedFrames: {
            type: Number,
            default: 0
        },
        detectionsByClass: {
            mobil: {
                type: Number,
                default: 0
            },
            motor: {
                type: Number,
                default: 0
            }
        },
        averageConfidence: {
            type: Number,
            min: 0,
            max: 1
        },
        // Frame-by-frame detections (optional, can be heavy)
        frameDetections: [{
            frameNumber: Number,
            timestamp: Number, // in seconds
            detections: [{
                class: String,
                confidence: Number,
                bbox: {
                    x: Number,
                    y: Number,
                    width: Number,
                    height: Number
                }
            }]
        }]
    },
    // Additional fields for tracking
    outputVideoPath: String,
    resultsPath: String,
    totalVehicles: {
        type: Number,
        default: 0
    },
    accuracy: Number,
    processingTime: Number,
    frameCount: Number,
    detailResults: mongoose.Schema.Types.Mixed,
    error: String,
    // Counting data (counting line feature)
    countingData: {
        totalCounted: {
            type: Number,
            default: 0
        },
        laneKiri: {
            total: { type: Number, default: 0 },
            mobil: { type: Number, default: 0 },
            bus: { type: Number, default: 0 },
            truk: { type: Number, default: 0 }
        },
        laneKanan: {
            total: { type: Number, default: 0 },
            mobil: { type: Number, default: 0 },
            bus: { type: Number, default: 0 },
            truk: { type: Number, default: 0 }
        },
        linePosition: {
            type: Number,
            default: 300
        },
        countedVehicleIds: [Number]
    },
    // Input video Cloudinary fields (video asli yang diupload)
    inputCloudinaryUrl: String,
    inputCloudinaryId: String,
    // Output video Cloudinary fields (video hasil deteksi YOLO)
    cloudinaryVideoUrl: String,
    cloudinaryVideoId: String,
    // Results JSON Cloudinary fields (results.json dari YOLO)
    resultsCloudinaryUrl: String,
    resultsCloudinaryId: String,
    // Storage metadata
    storageType: {
        type: String,
        enum: ['local', 'cloudinary', 'hybrid'],
        default: 'local'
    },
    localFilesDeleted: {
        type: Boolean,
        default: false
    },
    // Processing metrics
    processingMetrics: {
        startTime: Date,
        endTime: Date,
        duration: Number, // in seconds
        fps: Number,
        device: {
            type: String,
            default: 'CPU'
        }
    }
}, {
    timestamps: true
});

// Indexes
deteksiSchema.index({ idVideo: 1 });
deteksiSchema.index({ timestamp: -1 });

// Virtual for total detections
deteksiSchema.virtual('totalDetections').get(function() {
    if (!this.detectionData || !this.detectionData.detectionsByClass) return 0;
    const { mobil = 0, motor = 0 } = this.detectionData.detectionsByClass;
    return mobil + motor;
});

// Method to get detection summary
deteksiSchema.methods.getSummary = function() {
    return {
        videoId: this.idVideo,
        model: this.modelVersion,
        totalDetections: this.totalDetections,
        mobil: this.detectionData?.detectionsByClass?.mobil || 0,
        motor: this.detectionData?.detectionsByClass?.motor || 0,
        confidence: this.confidence,
        averageConfidence: this.detectionData?.averageConfidence,
        processedFrames: this.detectionData?.processedFrames,
        totalFrames: this.detectionData?.totalFrames,
        processingDuration: this.processingMetrics?.duration
    };
};

module.exports = mongoose.model('DeteksiYOLO', deteksiSchema);
