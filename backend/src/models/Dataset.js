const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
    namaDataset: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    // Dataset info
    totalImages: {
        type: Number,
        default: 0
    },
    totalVideos: {
        type: Number,
        default: 0
    },
    classes: [{
        className: String,
        count: Number
    }],
    // Storage info
    storageUrl: {
        type: String
    },
    storageSize: {
        type: Number // in bytes
    },
    // Version control
    version: {
        type: String,
        default: '1.0.0'
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    // Creator
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Method to add data to dataset
datasetSchema.methods.simpanData = async function(data) {
    // Implementation for saving data
    // This would involve storing to Cloudinary or other storage
    return {
        success: true,
        message: 'Data berhasil disimpan'
    };
};

// Method to download dataset
datasetSchema.methods.unduhData = function() {
    return this.storageUrl;
};

module.exports = mongoose.model('Dataset', datasetSchema);
