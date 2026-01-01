const logger = require('../utils/logger');

/**
 * Middleware untuk membatasi akses berdasarkan role
 * @param {string[]} allowedRoles - Array role yang diizinkan mengakses
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            logger.warn('Role authorization failed: User not authenticated');
            return res.status(401).json({
                success: false,
                status: 'error',
                message: 'Anda harus login terlebih dahulu',
                code: 'NOT_AUTHENTICATED'
            });
        }

        const userRole = req.user.role || 'user';
        
        if (!allowedRoles.includes(userRole)) {
            logger.warn(`Role authorization failed: User ${req.user.namaUser || req.user._id} with role ${userRole} tried to access resource requiring ${allowedRoles.join(', ')}`);
            return res.status(403).json({
                success: false,
                status: 'error',
                message: 'Anda tidak memiliki izin untuk mengakses fitur ini',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

// Middleware untuk admin only
const adminOnly = authorizeRoles('admin');

// Middleware untuk surveyor dan admin
const surveyorOrAdmin = authorizeRoles('admin', 'surveyor');

// Middleware untuk semua authenticated users
const authenticatedOnly = authorizeRoles('admin', 'surveyor', 'user');

module.exports = {
    authorizeRoles,
    adminOnly,
    surveyorOrAdmin,
    authenticatedOnly
};
