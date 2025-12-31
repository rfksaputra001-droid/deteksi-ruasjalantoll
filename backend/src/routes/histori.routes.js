const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const { surveyorOrAdmin } = require('../middlewares/roleAuth');
const Perhitungan = require('../models/Perhitungan');
const DeteksiYOLO = require('../models/DeteksiYOLO');

router.use(authenticate);
// Hanya surveyor dan admin yang bisa akses histori
router.use(surveyorOrAdmin);

// GET /api/histori/list - Get all history (perhitungan) - admin lihat semua, surveyor hanya milik sendiri
router.get('/list', async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role;
        const { page = 1, limit = 10 } = req.query;

        // Admin bisa lihat semua data, surveyor hanya data sendiri
        const filter = userRole === 'admin' ? {} : { userId };

        // Get perhitungan data
        const perhitunganList = await Perhitungan.find(filter)
            .populate('idDeteksi', 'videoFileName createdAt')
            .populate('userId', 'namaUser') // Populate user info untuk admin
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Perhitungan.countDocuments(filter);

        // Format data for frontend
        const formattedData = perhitunganList.map((item, index) => ({
            _id: item._id,
            id: (page - 1) * limit + index + 1,
            date: item.createdAt,
            namaRuas: item.metrics?.namaRuas || 'Tidak diketahui',
            tipeJalan: item.metrics?.tipeJalan || '-',
            waktuObservasi: item.metrics?.waktuObservasi || '-',
            volume: item.metrics?.flowRate || 0,
            kapasitas: item.metrics?.kapasitas || 0,
            dj: item.DJ || 0,
            los: item.LOS || '-',
            deteksiId: item.idDeteksi?._id || item.metrics?.deteksiId || null,
            videoFileName: item.idDeteksi?.videoFileName || null,
            totalKendaraan: item.totalKendaraan || 0,
            jumlahMobil: item.jumlahMobil || 0,
            jumlahMotor: item.jumlahMotor || 0,
            // Tambah info user untuk admin
            userName: userRole === 'admin' ? (item.userId?.namaUser || 'Unknown') : undefined,
            result: {
                los: item.LOS,
                dj: item.DJ,
                volume: item.metrics?.flowRate || 0,
                kapasitas: item.metrics?.kapasitas || 0,
                derajatJenuh: item.DJ
            }
        }));

        res.json({
            status: 'success',
            data: formattedData,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Histori list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Gagal mengambil data histori',
            error: error.message
        });
    }
});

// GET /api/histori/detail/:id - Get detail of specific history
router.get('/detail/:id', async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;

        // Admin bisa lihat detail semua data, surveyor hanya data sendiri
        const filter = userRole === 'admin' ? { _id: id } : { _id: id, userId };

        const perhitungan = await Perhitungan.findOne(filter)
            .populate('idDeteksi')
            .populate('userId', 'namaUser');

        if (!perhitungan) {
            return res.status(404).json({
                status: 'error',
                message: 'Data histori tidak ditemukan'
            });
        }

        // Get deteksi details if available
        let deteksiData = null;
        if (perhitungan.idDeteksi) {
            deteksiData = {
                _id: perhitungan.idDeteksi._id,
                videoFileName: perhitungan.idDeteksi.videoFileName,
                cloudinaryVideoUrl: perhitungan.idDeteksi.cloudinaryVideoUrl,
                countingData: perhitungan.idDeteksi.countingData,
                status: perhitungan.idDeteksi.status
            };
        }

        res.json({
            status: 'success',
            data: {
                _id: perhitungan._id,
                namaRuas: perhitungan.metrics?.namaRuas || '-',
                tipeJalan: perhitungan.metrics?.tipeJalan || '-',
                waktuObservasi: perhitungan.metrics?.waktuObservasi || '-',
                volume: perhitungan.metrics?.flowRate || 0,
                kapasitas: perhitungan.metrics?.kapasitas || 0,
                dj: perhitungan.DJ,
                los: perhitungan.LOS,
                totalKendaraan: perhitungan.totalKendaraan || 0,
                jumlahMobil: perhitungan.jumlahMobil || 0,
                jumlahMotor: perhitungan.jumlahMotor || 0,
                createdAt: perhitungan.createdAt,
                deteksi: deteksiData,
                result: {
                    los: perhitungan.LOS,
                    dj: perhitungan.DJ,
                    volume: perhitungan.metrics?.flowRate || 0,
                    kapasitas: perhitungan.metrics?.kapasitas || 0,
                    derajatJenuh: perhitungan.DJ
                }
            }
        });

    } catch (error) {
        console.error('Histori detail error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Gagal mengambil detail histori',
            error: error.message
        });
    }
});

// DELETE /api/histori/:id - Delete history entry
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const perhitungan = await Perhitungan.findOneAndDelete({ _id: id, userId });

        if (!perhitungan) {
            return res.status(404).json({
                status: 'error',
                message: 'Data histori tidak ditemukan'
            });
        }

        res.json({
            status: 'success',
            message: 'Data histori berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete histori error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Gagal menghapus histori',
            error: error.message
        });
    }
});

module.exports = router;
