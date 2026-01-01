const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middlewares/auth');
const adminAuth = require('../middlewares/adminAuth');

// All routes require authentication and admin role
router.use(authenticate);
router.use(adminAuth);

// Admin dashboard
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUser);
router.post('/users', adminController.createUser);
router.post('/users/check-email', adminController.checkEmailAvailability);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);
router.put('/users/:id/reset-password', adminController.resetPassword);

module.exports = router;
