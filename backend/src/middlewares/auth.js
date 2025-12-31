const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            logger.warn('Authentication failed: No token provided');
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'Token tidak tersedia. Silakan login kembali.',
                code: 'TOKEN_MISSING'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (tokenError) {
            logger.warn(`Token verification failed: ${tokenError.message}`);
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'Token tidak valid atau telah kadaluarsa. Silakan login kembali.',
                code: 'TOKEN_INVALID'
            });
        }

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'Format token tidak valid. Silakan login kembali.',
                code: 'TOKEN_MALFORMED'
            });
        }

        // Get user from token
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'Pengguna tidak ditemukan. Akun mungkin telah dihapus.',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Akun Anda telah dinonaktifkan. Hubungi administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Update last activity
        user.lastActivity = new Date();
        await user.save();

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({
            success: false,
            status: 'error',
            message: 'Terjadi kesalahan server saat memverifikasi autentikasi',
            code: 'AUTH_SERVER_ERROR'
        });
    }
};

module.exports = authenticate;
