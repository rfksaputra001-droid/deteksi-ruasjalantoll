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

// ═══════════════════════════════════════════════════════════════
// TRUST PROXY - CRITICAL FOR RENDER.COM
// ═══════════════════════════════════════════════════════════════
// Render.com uses reverse proxy, so we need to trust it
// This enables:
// - Correct client IP detection (req.ip)
// - Proper rate limiting per user
// - X-Forwarded-* headers parsing
// Value explanation:
// - 1 = trust first proxy (Render's load balancer)
// - 'loopback' = trust localhost
// - true = trust all proxies (less secure)
// ═══════════════════════════════════════════════════════════════
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (Render)
  logger.info('✅ Trust proxy enabled for production (Render.com)');
} else {
  app.set('trust proxy', 'loopback'); // Trust localhost in dev
}

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

// CORS - Fix for production with external frontend
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = process.env.NODE_ENV === 'production' 
            ? [
                'https://deteksi-ruasjalantoll.vercel.app',
                'https://yolo-detection-api.onrender.com',
                process.env.CLIENT_URL,
                process.env.FRONTEND_URL
            ].filter(Boolean)
            : [
                'http://localhost:5173',
                'http://localhost:5174', 
                'http://localhost:3000',
                process.env.CLIENT_URL || 'http://localhost:5173'
            ];
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow all origins in production for now
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With']
}));

// Rate limiting - configured for proxy environment
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 5000 : 500, // Higher limit for development
    message: { 
        success: false,
        status: 'error',
        message: 'Terlalu banyak request dari IP ini, coba lagi nanti.'
    },
    standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,   // Disable `X-RateLimit-*` headers
    // ═══════════════════════════════════════════════════════════════
    // KEY FIX: Use proper key generator for proxy environment
    // This ensures each user gets their own rate limit bucket
    // ═══════════════════════════════════════════════════════════════
    keyGenerator: (req) => {
      // With trust proxy enabled, req.ip will be the real client IP
      return req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    },
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
app.use('/api/info', infoRoutes);      // ✅ FIX: Add missing info routes!
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/deteksi', deteksiRoutes);
app.use('/api/histori', historiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/perhitungan', perhitunganRoutes);

// API-only backend - frontend deployed separately on Vercel
// Handle 404 for unknown API routes
app.get('*', (req, res) => {
    // All routes should be API routes
    if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/') {
        if (req.path === '/') {
            return res.json({
                status: 'success',
                message: 'YOLO Detection Backend API',
                version: '2.0',
                endpoints: {
                    health: '/health',
                    info: '/api/info',
                    auth: '/api/auth',
                    deteksi: '/api/deteksi',
                    dashboard: '/api/dashboard'
                }
            });
        }
        return res.status(404).json({
            status: 'error',
            message: 'Route tidak ditemukan'
        });
    }
    
    // Redirect non-API requests to frontend
    return res.status(404).json({
        status: 'error',
        message: 'Backend API only - Frontend available at Vercel deployment'
    });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
