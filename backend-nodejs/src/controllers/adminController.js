const User = require('../models/User');
const Video = require('../models/Video');
const Histori = require('../models/Histori');
const logger = require('../utils/logger');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, role, isActive, search } = req.query;

        const query = {};

        // Filter by role
        if (role) {
            query.role = role;
        }

        // Filter by active status
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Search by name or email
        if (search) {
            query.$or = [
                { namaUser: { $regex: search, $options: 'i' } },
                { emailUser: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-passwordUser')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        // Get video count for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const videoCount = await Video.countDocuments({ idUser: user._id });
            return {
                ...user.toJSON(),
                videoCount
            };
        }));

        res.status(200).json({
            status: 'success',
            data: {
                users: usersWithStats,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        logger.error('Get all users error:', error);
        next(error);
    }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-passwordUser');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User tidak ditemukan'
            });
        }

        // Get user stats
        const videoCount = await Video.countDocuments({ idUser: user._id });
        const lastActivity = await Histori.findOne({ idUser: user._id })
            .sort({ tanggal: -1 });

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    ...user.toJSON(),
                    stats: {
                        videoCount,
                        lastActivity: lastActivity?.tanggal
                    }
                }
            }
        });

    } catch (error) {
        logger.error('Get user error:', error);
        next(error);
    }
};

// @desc    Create new user (by admin)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
    try {
        const { namaUser, emailUser, passwordUser, role, phoneNumber } = req.body;

        // Validate required fields
        if (!namaUser || !emailUser || !passwordUser) {
            return res.status(400).json({
                status: 'error',
                message: 'Nama, email, dan password wajib diisi'
            });
        }

        // Normalize email to lowercase for consistent checking
        const normalizedEmail = emailUser.toLowerCase().trim();
        
        // Escape special regex characters to prevent regex injection
        const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        logger.info(`Attempting to create user with email: ${normalizedEmail}`);

        // Check if user exists (case-insensitive)
        const userExists = await User.findOne({ 
            emailUser: { $regex: new RegExp(`^${escapedEmail}$`, 'i') }
        });
        
        if (userExists) {
            logger.warn(`User creation failed - email already exists: ${normalizedEmail}`);
            return res.status(400).json({
                status: 'error',
                message: 'Email sudah terdaftar'
            });
        }

        // Create user
        const user = await User.create({
            namaUser: namaUser.trim(),
            emailUser: normalizedEmail,
            passwordUser,
            role: role || 'user',
            phoneNumber: phoneNumber || null
        });

        logger.info(`Admin created new user: ${normalizedEmail}`);

        res.status(201).json({
            status: 'success',
            message: 'User berhasil dibuat',
            data: { 
                user: {
                    _id: user._id,
                    namaUser: user.namaUser,
                    emailUser: user.emailUser,
                    role: user.role,
                    isActive: user.isActive,
                    createdAt: user.createdAt
                }
            }
        });

    } catch (error) {
        logger.error('Create user error:', error);
        
        // Handle duplicate key error from MongoDB
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Email sudah terdaftar (duplicate key)'
            });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                status: 'error',
                message: messages.join(', ')
            });
        }
        
        next(error);
    }
};

// @desc    Check if email is available
// @route   POST /api/admin/users/check-email
// @access  Private/Admin
exports.checkEmailAvailability = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'Email harus diisi'
            });
        }
        
        const normalizedEmail = email.toLowerCase().trim();
        
        // Escape special regex characters
        const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const userExists = await User.findOne({ 
            emailUser: { $regex: new RegExp(`^${escapedEmail}$`, 'i') }
        });
        
        res.status(200).json({
            status: 'success',
            data: {
                email: normalizedEmail,
                available: !userExists,
                existingUser: userExists ? {
                    id: userExists._id,
                    nama: userExists.namaUser,
                    email: userExists.emailUser
                } : null
            }
        });
        
    } catch (error) {
        logger.error('Check email error:', error);
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
    try {
        const { namaUser, emailUser, role, isActive, phoneNumber } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User tidak ditemukan'
            });
        }

        // Update fields
        if (namaUser) user.namaUser = namaUser;
        if (emailUser) user.emailUser = emailUser;
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        if (phoneNumber) user.phoneNumber = phoneNumber;

        await user.save();

        logger.info(`Admin updated user: ${user.emailUser}`);

        res.status(200).json({
            status: 'success',
            message: 'User berhasil diupdate',
            data: { user }
        });

    } catch (error) {
        logger.error('Update user error:', error);
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User tidak ditemukan'
            });
        }

        // Don't allow deleting yourself
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                status: 'error',
                message: 'Anda tidak bisa menghapus akun sendiri'
            });
        }

        // Delete user's videos
        await Video.deleteMany({ idUser: user._id });

        // Delete user
        await user.deleteOne();

        logger.info(`Admin deleted user: ${user.emailUser}`);

        res.status(200).json({
            status: 'success',
            message: 'User berhasil dihapus'
        });

    } catch (error) {
        logger.error('Delete user error:', error);
        next(error);
    }
};

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/toggle-status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User tidak ditemukan'
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        logger.info(`Admin toggled user status: ${user.emailUser} - ${user.isActive ? 'Active' : 'Inactive'}`);

        res.status(200).json({
            status: 'success',
            message: `User berhasil ${user.isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
            data: { user }
        });

    } catch (error) {
        logger.error('Toggle user status error:', error);
        next(error);
    }
};

// @desc    Reset user password (by admin)
// @route   PUT /api/admin/users/:id/reset-password
// @access  Private/Admin
exports.resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                status: 'error',
                message: 'Password minimal 6 karakter'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User tidak ditemukan'
            });
        }

        user.passwordUser = newPassword;
        await user.save();

        logger.info(`Admin reset password for user: ${user.emailUser}`);

        res.status(200).json({
            status: 'success',
            message: 'Password berhasil direset'
        });

    } catch (error) {
        logger.error('Reset password error:', error);
        next(error);
    }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
        const totalVideos = await Video.countDocuments();
        const processingVideos = await Video.countDocuments({ statusProses: 'PROCESSING' });
        const completedVideos = await Video.countDocuments({ statusProses: 'COMPLETED' });

        // Get recent users
        const recentUsers = await User.find({ role: 'user' })
            .select('-passwordUser')
            .sort({ createdAt: -1 })
            .limit(5);

        // Get recent activities
        const recentActivities = await Histori.find()
            .populate('idUser', 'namaUser emailUser')
            .sort({ tanggal: -1 })
            .limit(10);

        res.status(200).json({
            status: 'success',
            data: {
                stats: {
                    users: {
                        total: totalUsers,
                        active: activeUsers,
                        inactive: totalUsers - activeUsers
                    },
                    videos: {
                        total: totalVideos,
                        processing: processingVideos,
                        completed: completedVideos
                    }
                },
                recentUsers,
                recentActivities: recentActivities.map(a => a.formatForDisplay())
            }
        });

    } catch (error) {
        logger.error('Get dashboard stats error:', error);
        next(error);
    }
};
