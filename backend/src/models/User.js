const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    namaUser: {
        type: String,
        required: [true, 'Nama harus diisi'],
        trim: true,
        maxlength: [100, 'Nama maksimal 100 karakter']
    },
    emailUser: {
        type: String,
        required: [true, 'Email harus diisi'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email tidak valid']
    },
    passwordUser: {
        type: String,
        required: [true, 'Password harus diisi'],
        minlength: [6, 'Password minimal 6 karakter'],
        select: false // Don't include in queries by default
    },
    role: {
        type: String,
        enum: ['admin', 'surveyor', 'user'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    profileImage: {
        type: String,
        default: null
    },
    phoneNumber: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
userSchema.index({ emailUser: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('passwordUser')) {
        return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.passwordUser = await bcrypt.hash(this.passwordUser, salt);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordUser);
};

// Hide password in JSON response
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.passwordUser;
    delete obj.__v;
    return obj;
};

// Virtual for video count
userSchema.virtual('videoCount', {
    ref: 'Video',
    localField: '_id',
    foreignField: 'idUser',
    count: true
});

module.exports = mongoose.model('User', userSchema);
