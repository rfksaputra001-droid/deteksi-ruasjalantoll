const User = require('../models/User');
const Histori = require('../models/Histori');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { namaUser, emailUser, passwordUser } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ emailUser });
        if (userExists) {
            return res.status(400).json({
                status: 'error',
                message: 'Email sudah terdaftar'
            });
        }

        // Create user
        const user = await User.create({
            namaUser,
            emailUser,
            passwordUser,
            role: 'user'
        });

        // Create history log
        await Histori.createLog({
            userId: user._id,
            actionType: 'UPLOAD',
            description: `User ${namaUser} berhasil registrasi`,
            req
        });

        // Generate token
        const token = generateToken(user._id);

        logger.info(`New user registered: ${emailUser}`);

        res.status(201).json({
            status: 'success',
            message: 'Registrasi berhasil',
            data: {
                user: {
                    id: user._id,
                    nama: user.namaUser,
                    email: user.emailUser,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        logger.error('Register error:', error);
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { emailUser, passwordUser } = req.body;

        if (!emailUser || !passwordUser) {
            return res.status(400).json({
                status: 'error',
                message: 'Email dan password harus diisi'
            });
        }

        const user = await User.findOne({ emailUser }).select('+passwordUser');
        
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Email atau password salah'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                status: 'error',
                message: 'Akun Anda telah dinonaktifkan'
            });
        }

        const isPasswordCorrect = await user.comparePassword(passwordUser);
        
        if (!isPasswordCorrect) {
            return res.status(401).json({
                status: 'error',
                message: 'Email atau password salah'
            });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        logger.info(`User logged in: ${emailUser}`);

        res.status(200).json({
            status: 'success',
            message: 'Login berhasil',
            data: {
                user: {
                    id: user._id,
                    nama: user.namaUser,
                    email: user.emailUser,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        next(error);
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { user }
        });

    } catch (error) {
        logger.error('Get me error:', error);
        next(error);
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select('+passwordUser');

        const isPasswordCorrect = await user.comparePassword(oldPassword);
        
        if (!isPasswordCorrect) {
            return res.status(401).json({
                status: 'error',
                message: 'Password lama salah'
            });
        }

        user.passwordUser = newPassword;
        await user.save();

        logger.info(`Password changed for user: ${user.emailUser}`);

        res.status(200).json({
            status: 'success',
            message: 'Password berhasil diubah'
        });

    } catch (error) {
        logger.error('Change password error:', error);
        next(error);
    }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    try {
        logger.info(`User logged out: ${req.user.id}`);

        res.status(200).json({
            status: 'success',
            message: 'Logout berhasil'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        next(error);
    }
};
