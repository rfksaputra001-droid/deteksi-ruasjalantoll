const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');

// Import routes
const infoRoutes = require('./routes/info.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const videoRoutes = require('./routes/video.routes');
const deteksiRoutes = require('./routes/deteksi.routes');
const historiRoutes = require('./routes/histori.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const perhitunganRoutes = require('./routes/perhitungan.routes');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "https:", "wss:"]
        },
    },
}));

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? true // Allow same origin in production (since frontend served by same server)
        : [
            process.env.CLIENT_URL || 'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5173'
        ],
    credentials: true
}));

// Rate limiting - more lenient for development
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 5000 : 500, // Higher limit for development
    message: { 
        success: false,
        status: 'error',
        message: 'Terlalu banyak request dari IP ini, coba lagi nanti.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in development mode
    skip: (req) => process.env.NODE_ENV === 'development'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API info
app.get('/api', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'YOLO Detection API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            admin: '/api/admin',
            videos: '/api/videos',
            deteksi: '/api/deteksi',
            histori: '/api/histori',
            dashboard: '/api/dashboard',
            perhitungan: '/api/perhitungan'
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/deteksi', deteksiRoutes);
app.use('/api/histori', historiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/perhitungan', perhitunganRoutes);

// Serve static files from React build
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
        return res.status(404).json({
            status: 'error',
            message: 'Route tidak ditemukan'
        });
    }
    
    // Serve React app
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
