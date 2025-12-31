const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const { surveyorOrAdmin } = require('../middlewares/roleAuth');
const upload = require('../middlewares/upload');
const deteksiController = require('../controllers/deteksiController');

// Semua route memerlukan authentication
router.use(authenticate);
// Route deteksi hanya untuk surveyor dan admin
router.use(surveyorOrAdmin);

// Upload video untuk deteksi
router.post('/upload', upload.single('video'), deteksiController.uploadVideo);

// Get detection result
router.get('/result/:detectionId', deteksiController.getDetectionResult);

// Get detection status
router.get('/status/:detectionId', deteksiController.getDetectionStatus);

// Stream video from Cloudinary or local
router.get('/video/:detectionId', deteksiController.streamVideo);

// Stream local output video directly (fallback route)
router.get('/video/:detectionId/output', deteksiController.streamVideo);

// Delete detection
router.delete('/:detectionId', deteksiController.deleteDetection);

// List detections
router.get('/list', deteksiController.listDetections);

// Get all detections
router.get('/', (req, res) => {
    res.json({ 
        status: 'success', 
        message: 'Deteksi API',
        endpoints: {
            'POST /api/deteksi/upload': 'Upload video untuk deteksi',
            'GET /api/deteksi/list': 'List detections dengan pagination',
            'GET /api/deteksi/result/:detectionId': 'Get detail hasil deteksi',
            'GET /api/deteksi/status/:detectionId': 'Get status deteksi',
            'GET /api/deteksi/video/:detectionId': 'Stream video hasil deteksi',
            'DELETE /api/deteksi/:detectionId': 'Hapus detection dan file terkait'
        }
    });
});

module.exports = router;
