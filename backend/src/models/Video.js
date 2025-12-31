const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    idUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    namaFile: {
        type: String,
        required: true
    },
    judukanFile: {
        type: String,
        required: true
    },
    durasVideo: {
        type: Number, // in seconds
        required: true
    },
    tanggalUpload: {
        type: Date,
        default: Date.now,
        index: true
    },
    statusProses: {
        type: String,
        enum: ['UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'UPLOADED',
        index: true
    },
    // Cloudinary info
    cloudinaryId: {
        type: String,
        sparse: true
    },
    cloudinaryUrl: {
        type: String
    },
    thumbnailUrl: {
        type: String
    },
    // Original video info (before processing)
    originalSize: {
        type: Number // in bytes
    },
    originalDuration: {
        type: Number // in seconds
    },
    originalResolution: {
        type: String // e.g., "1920x1080"
    },
    // Processed video info
    processedSize: {
        type: Number // in bytes
    },
    processedResolution: {
        type: String // e.g., "854x480"
    },
    // Processing info
    processedAt: {
        type: Date
    },
    processingDuration: {
        type: Number // in seconds
    },
    errorMessage: {
        type: String
    },
    // Expiry
    expiresAt: {
        type: Date,
        index: true
    },
    // Stats
    viewCount: {
        type: Number,
        default: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for faster queries
videoSchema.index({ idUser: 1, tanggalUpload: -1 });
videoSchema.index({ statusProses: 1, tanggalUpload: -1 });
videoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for age in days
videoSchema.virtual('ageInDays').get(function() {
    const now = new Date();
    const uploadDate = new Date(this.tanggalUpload);
    const diffTime = Math.abs(now - uploadDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if video is expired
videoSchema.methods.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
};

// Static method to get user's video count
videoSchema.statics.getUserVideoCount = async function(userId) {
    return await this.countDocuments({ idUser: userId, isDeleted: false });
};

// Pre-save hook to set expiry date
videoSchema.pre('save', function(next) {
    if (this.isNew && !this.expiresAt) {
        const expiryDays = parseInt(process.env.VIDEO_EXPIRY_DAYS) || 7;
        this.expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    }
    next();
});

module.exports = mongoose.model('Video', videoSchema);
