const mongoose = require('mongoose');

const perhitunganSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    idDeteksi: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeteksiYOLO',
        sparse: true // Make it optional for manual calculations
    },
    idVideo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        sparse: true,
        index: true
    },
    waktuProses: {
        type: Date,
        default: Date.now
    },
    // Results
    jumlahMobil: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    jumlahMotor: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    totalKendaraan: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    // Calculations
    DJ: {
        type: Number,
        required: true,
        min: 0
    },
    LOS: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'E', 'F'],
        required: true
    },
    // Additional metrics
    metrics: {
        namaRuas: String,
        tipeJalan: String,
        kapasitas: Number,
        flowRate: Number, // Volume in SMP/jam
        durasiMenit: Number,
        waktuObservasi: String,
        deteksiId: mongoose.Schema.Types.ObjectId,
        averageSpeed: Number, // km/h (optional)
        density: Number, // vehicles per km (optional)
        peakHour: {
            start: String,
            end: String,
            count: Number
        }
    }
}, {
    timestamps: true
});

// Indexes
perhitunganSchema.index({ idVideo: 1 });
perhitunganSchema.index({ waktuProses: -1 });

// Calculate total before saving
perhitunganSchema.pre('save', function(next) {
    this.totalKendaraan = this.jumlahMobil + this.jumlahMotor;
    next();
});

// Static method to calculate DJ (Derajat Jenuh)
perhitunganSchema.statics.calculateDJ = function(jumlahMobil, jumlahMotor) {
    // Formula DJ = (Q / C)
    // Q = Volume lalu lintas (smp/jam)
    // C = Kapasitas jalan (smp/jam)
    
    // Konversi ke satuan mobil penumpang (SMP)
    // 1 mobil = 1 SMP
    // 1 motor = 0.5 SMP
    const totalSMP = jumlahMobil + (jumlahMotor * 0.5);
    
    // Asumsi kapasitas jalan (bisa disesuaikan)
    const kapasitasJalan = 2000; // SMP per jam
    
    const DJ = totalSMP / kapasitasJalan;
    return Math.min(DJ, 1); // Max 1
};

// Static method to calculate LOS based on DJ
perhitunganSchema.statics.calculateLOS = function(DJ) {
    if (DJ <= 0.20) return 'A';
    if (DJ <= 0.44) return 'B';
    if (DJ <= 0.72) return 'C';
    if (DJ <= 0.84) return 'D';
    if (DJ <= 0.92) return 'E';
    return 'F';
};

// Method to get full calculation result
perhitunganSchema.methods.getFullResult = function() {
    return {
        perhitunganId: this._id,
        videoId: this.idVideo,
        deteksiId: this.idDeteksi,
        waktuProses: this.waktuProses,
        hasil: {
            jumlahMobil: this.jumlahMobil,
            jumlahMotor: this.jumlahMotor,
            totalKendaraan: this.totalKendaraan,
            DJ: this.DJ,
            LOS: this.LOS
        },
        metrics: this.metrics
    };
};

// Virtual for LOS description
perhitunganSchema.virtual('losDescription').get(function() {
    const descriptions = {
        'A': 'Kondisi arus bebas dengan kecepatan tinggi',
        'B': 'Arus stabil dengan kecepatan mulai dibatasi',
        'C': 'Arus stabil dengan kecepatan terbatas',
        'D': 'Arus mendekati tidak stabil',
        'E': 'Arus tidak stabil, sering berhenti',
        'F': 'Arus dipaksa atau macet'
    };
    return descriptions[this.LOS] || 'Tidak diketahui';
});

module.exports = mongoose.model('Perhitungan', perhitunganSchema);
