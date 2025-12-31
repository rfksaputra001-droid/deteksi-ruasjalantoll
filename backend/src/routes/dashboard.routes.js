const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const Perhitungan = require('../models/Perhitungan');
const DeteksiYOLO = require('../models/DeteksiYOLO');

router.use(authenticate);

// GET /api/dashboard - Get dashboard statistics dengan filter tanggal
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { date } = req.query; // Parameter tanggal opsional

        // Get all perhitungan (semua data untuk semua role)
        const perhitunganList = await Perhitungan.find({}).sort({ createdAt: -1 });
        
        // Get all deteksi (semua data untuk semua role)
        const deteksiList = await DeteksiYOLO.find({ status: 'completed' });

        // Filter berdasarkan tanggal jika ada parameter date
        let filteredPerhitungan = perhitunganList;
        if (date) {
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            filteredPerhitungan = perhitunganList.filter(item => {
                const itemDate = new Date(item.createdAt);
                return itemDate >= targetDate && itemDate < nextDay;
            });
        }

        // Calculate total traffic counter (sum of all vehicle counts from deteksi)
        let totalTrafficCounter = 0;
        deteksiList.forEach(deteksi => {
            if (deteksi.countingData) {
                const laneKiri = deteksi.countingData.laneKiri || {};
                const laneKanan = deteksi.countingData.laneKanan || {};
                totalTrafficCounter += (laneKiri.mobil || 0) + (laneKiri.bus || 0) + (laneKiri.truk || 0);
                totalTrafficCounter += (laneKanan.mobil || 0) + (laneKanan.bus || 0) + (laneKanan.truk || 0);
            }
        });

        // Calculate LOS distribution from perhitungan (semua data atau data hari tertentu)
        const losDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
        let highestLOS = null;
        let highestLOSLocation = null;
        let highestLOSTime = null;

        // Filter today's data for "LOS Tertinggi Hari Ini" (atau hari yang dipilih)
        const today = date ? new Date(date) : new Date();
        today.setHours(0, 0, 0, 0);
        const todayPerhitungan = filteredPerhitungan.filter(item => {
            const itemDate = new Date(item.createdAt);
            const dayStart = new Date(today);
            const dayEnd = new Date(today);
            dayEnd.setDate(dayEnd.getDate() + 1);
            return itemDate >= dayStart && itemDate < dayEnd;
        });

        perhitunganList.forEach(item => {
            if (item.LOS) {
                const los = item.LOS.toUpperCase();
                if (losDistribution.hasOwnProperty(los)) {
                    losDistribution[los]++;
                }
            }
        });

        // Find highest LOS from today only - using waktuObservasi
        todayPerhitungan.forEach(item => {
            if (item.LOS) {
                const los = item.LOS.toUpperCase();
                const losOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
                if (!highestLOS || losOrder.indexOf(los) > losOrder.indexOf(highestLOS)) {
                    highestLOS = los;
                    highestLOSLocation = item.metrics?.namaRuas || 'Unknown';
                    // Use waktuObservasi if available, otherwise use createdAt
                    highestLOSTime = item.metrics?.waktuObservasi || 
                        new Date(item.createdAt).toLocaleTimeString('id-ID', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });
                }
            }
        });

        // Calculate percentages
        const totalLOS = Object.values(losDistribution).reduce((a, b) => a + b, 0);
        const losPercentages = {};
        Object.keys(losDistribution).forEach(los => {
            losPercentages[los] = totalLOS > 0 ? ((losDistribution[los] / totalLOS) * 100).toFixed(1) : 0;
        });

        // Get traffic data for chart - gunakan data hari tertentu (dari filteredPerhitungan)
        // Group data by waktuObservasi untuk chart
        const trafficData = filteredPerhitungan.map(item => ({
            date: item.createdAt,
            waktuObservasi: item.metrics?.waktuObservasi || '',
            namaRuas: item.metrics?.namaRuas || '-',
            volume: item.metrics?.flowRate || 0,
            kapasitas: item.metrics?.kapasitas || 0,
            los: item.LOS || '-',
            dj: item.DJ || 0
        })).sort((a, b) => {
            // Sort by waktuObservasi
            if (a.waktuObservasi && b.waktuObservasi) {
                return a.waktuObservasi.localeCompare(b.waktuObservasi);
            }
            return 0;
        });

        res.json({
            status: 'success',
            data: {
                totalTrafficCounter,
                highestLOS: highestLOS || '-',
                highestLOSLocation: highestLOSLocation || '-',
                highestLOSTime: highestLOSTime || '-',
                losDistribution,
                losPercentages,
                totalPerhitungan: perhitunganList.length,
                totalDeteksi: deteksiList.length,
                trafficData
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Gagal mengambil data dashboard',
            error: error.message
        });
    }
});

module.exports = router;
