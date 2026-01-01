const express = require('express');
const router = express.Router();
const perhitunganController = require('../controllers/perhitunganController');
const auth = require('../middlewares/auth');
const { surveyorOrAdmin } = require('../middlewares/roleAuth');

// Semua route perlu auth
router.use(auth);
// Hanya surveyor dan admin yang bisa akses
router.use(surveyorOrAdmin);

// POST /api/perhitungan/manual - Hitung dari input manual/CSV
router.post('/manual', perhitunganController.hitungManual);

// POST /api/perhitungan/deteksi/:deteksiId - Hitung dari hasil deteksi YOLO
router.post('/deteksi/:deteksiId', perhitunganController.hitungDariDeteksi);

// POST /api/perhitungan/sederhana/:deteksiId - Perhitungan sederhana (rumus user request)
router.post('/sederhana/:deteksiId', perhitunganController.hitungSederhana);

// GET /api/perhitungan/simple-constants - Get konstanta perhitungan sederhana
router.get('/simple-constants', perhitunganController.getSimpleConstants);

// GET /api/perhitungan/list - Daftar semua perhitungan
router.get('/list', perhitunganController.getList);

// GET /api/perhitungan/referensi - Referensi PKJI (tipe jalan, faktor, dll)
router.get('/referensi', perhitunganController.getReferensi);

// GET /api/perhitungan/deteksi-available - Daftar deteksi yang bisa dihitung
router.get('/deteksi-available', perhitunganController.getDeteksiAvailable);

// GET /api/perhitungan/:id - Detail perhitungan
router.get('/:id', perhitunganController.getDetail);

// DELETE /api/perhitungan/:id - Hapus perhitungan
router.delete('/:id', perhitunganController.delete);

module.exports = router;
