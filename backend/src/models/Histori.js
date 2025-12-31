const mongoose = require('mongoose');

const historiSchema = new mongoose.Schema({
    idUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tanggal: {
        type: Date,
        default: Date.now,
        index: true
    },
    actionType: {
        type: String,
        enum: ['UPLOAD', 'PROCESSING', 'COMPLETED', 'FAILED', 'DELETED', 'VIEWED'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    // Related documents
    relatedVideo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    },
    relatedPerhitungan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Perhitungan'
    },
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for faster queries
historiSchema.index({ idUser: 1, tanggal: -1 });
historiSchema.index({ actionType: 1, tanggal: -1 });
historiSchema.index({ relatedVideo: 1 });

// Static method to create history log
historiSchema.statics.createLog = async function(data) {
    const { userId, actionType, description, videoId, perhitunganId, metadata, req } = data;
    
    const logData = {
        idUser: userId,
        actionType,
        description,
        relatedVideo: videoId,
        relatedPerhitungan: perhitunganId,
        metadata: metadata || {}
    };

    // Add request info if available
    if (req) {
        logData.ipAddress = req.ip || req.connection.remoteAddress;
        logData.userAgent = req.get('user-agent');
    }

    return await this.create(logData);
};

// Static method to get user activity summary
historiSchema.statics.getUserActivitySummary = async function(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.aggregate([
        {
            $match: {
                idUser: mongoose.Types.ObjectId(userId),
                tanggal: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$actionType',
                count: { $sum: 1 },
                lastActivity: { $max: '$tanggal' }
            }
        }
    ]);

    return activities;
};

// Method to format for display
historiSchema.methods.formatForDisplay = function() {
    return {
        id: this._id,
        action: this.actionType,
        description: this.description,
        date: this.tanggal,
        videoId: this.relatedVideo,
        perhitunganId: this.relatedPerhitungan,
        metadata: this.metadata
    };
};

module.exports = mongoose.model('Histori', historiSchema);
