const Perhitungan = require('../models/Perhitungan');
const DeteksiYOLO = require('../models/DeteksiYOLO');
const logger = require('../utils/logger');

// Konstanta PKJI 2023
const PKJI_CONSTANTS = {
    // Kapasitas dasar (C0) per tipe jalan (smp/jam/lajur)
    kapasitasDasar: {
        '4/2 D': 1650,    // 4 lajur 2 arah dengan median
        '4/2 UD': 1500,   // 4 lajur 2 arah tanpa median
        '2/2 UD': 2900,   // 2 lajur 2 arah tanpa median (total 2 arah)
        '6/2 D': 1650,    // 6 lajur 2 arah dengan median
        '8/2 D': 1650,    // 8 lajur 2 arah dengan median
    },
    // Faktor penyesuaian kapasitas lebar lajur (FCw)
    faktorLebar: {
        '2.75': 0.91,
        '3.00': 0.96,
        '3.25': 0.99,
        '3.50': 1.00,
        '3.75': 1.02,
        '4.00': 1.04,
    },
    // Faktor penyesuaian kapasitas pemisah arah (FCsp) - untuk jalan 2 arah
    faktorPemisah: {
        '50-50': 1.00,
        '55-45': 0.97,
        '60-40': 0.94,
        '65-35': 0.91,
        '70-30': 0.88,
    },
    // Faktor penyesuaian kapasitas hambatan samping (FCsf)
    faktorHambatan: {
        'sangat rendah': 1.02,
        'rendah': 1.00,
        'sedang': 0.97,
        'tinggi': 0.93,
        'sangat tinggi': 0.88,
    },
    // Faktor penyesuaian kapasitas ukuran kota (FCcs)
    faktorKota: {
        'kecil': 0.86,      // < 0.1 juta
        'sedang': 0.90,     // 0.1-0.5 juta
        'besar': 0.94,      // 0.5-1.0 juta
        'sangat besar': 1.00, // > 1.0 juta
    },
    // Ekivalensi Mobil Penumpang (EMP)
    emp: {
        'mobil': 1.0,
        'bus': 1.2,
        'truk': 1.3,
        'motor': 0.25,     // PKJI 2023 nilai motor ~0.25-0.4
        'sepeda': 0.2,
    },
    // LOS thresholds based on DJ (Derajat Jenuh)
    losThresholds: {
        'A': { max: 0.20, desc: 'Arus bebas dengan kecepatan tinggi, pengemudi dapat memilih kecepatan yang diinginkan' },
        'B': { max: 0.44, desc: 'Arus stabil, tetapi kecepatan operasi mulai dibatasi oleh kondisi lalu lintas' },
        'C': { max: 0.72, desc: 'Arus stabil, tetapi kecepatan dan gerak kendaraan dikendalikan' },
        'D': { max: 0.84, desc: 'Arus mendekati tidak stabil, kecepatan masih dapat dikendalikan' },
        'E': { max: 0.92, desc: 'Arus tidak stabil, terjadi kemacetan' },
        'F': { max: 1.00, desc: 'Arus dipaksa atau macet, kecepatan rendah dan volume di bawah kapasitas' },
    }
};

// Hitung Kapasitas Jalan (C)
// Rumus: C = n × C0 × FCw × FCsp × FCsf × FCcs
const hitungKapasitas = (params) => {
    const {
        tipeJalan = '4/2 D',
        jumlahLajur = 2,
        lebarLajur = 3.5,
        faktorPemisah = '50-50',
        hambatanSamping = 'rendah',
        ukuranKota = 'besar'
    } = params;

    // Kapasitas dasar
    const C0 = PKJI_CONSTANTS.kapasitasDasar[tipeJalan] || 1650;
    
    // Faktor lebar (interpolasi jika perlu)
    const lebarKey = Object.keys(PKJI_CONSTANTS.faktorLebar)
        .reduce((prev, curr) => 
            Math.abs(parseFloat(curr) - lebarLajur) < Math.abs(parseFloat(prev) - lebarLajur) ? curr : prev
        );
    const FCw = PKJI_CONSTANTS.faktorLebar[lebarKey] || 1.00;
    
    // Faktor pemisah arah
    const FCsp = PKJI_CONSTANTS.faktorPemisah[faktorPemisah] || 1.00;
    
    // Faktor hambatan samping
    const FCsf = PKJI_CONSTANTS.faktorHambatan[hambatanSamping] || 1.00;
    
    // Faktor ukuran kota
    const FCcs = PKJI_CONSTANTS.faktorKota[ukuranKota] || 0.94;

    // Hitung kapasitas
    // Untuk jalan 4/2 D, n = jumlah lajur per arah
    const n = tipeJalan.includes('2/2') ? 1 : jumlahLajur;
    const kapasitas = n * C0 * FCw * FCsp * FCsf * FCcs;

    return {
        kapasitas: Math.round(kapasitas),
        detail: {
            n,
            C0,
            FCw,
            FCsp,
            FCsf,
            FCcs
        }
    };
};

// Hitung Volume Lalu Lintas dalam SMP/jam
const hitungVolumeSMP = (kendaraan, durasiMenit = 60) => {
    const { mobil = 0, bus = 0, truk = 0, motor = 0 } = kendaraan;
    
    // Konversi ke SMP
    const smpMobil = mobil * PKJI_CONSTANTS.emp.mobil;
    const smpBus = bus * PKJI_CONSTANTS.emp.bus;
    const smpTruk = truk * PKJI_CONSTANTS.emp.truk;
    const smpMotor = motor * PKJI_CONSTANTS.emp.motor;
    
    const totalSMP = smpMobil + smpBus + smpTruk + smpMotor;
    
    // Konversi ke per jam (jika durasi bukan 60 menit)
    const faktorJam = 60 / durasiMenit;
    const volumePerJam = totalSMP * faktorJam;

    return {
        volumeSMP: Math.round(volumePerJam),
        detail: {
            mobil: { count: mobil, smp: smpMobil },
            bus: { count: bus, smp: smpBus },
            truk: { count: truk, smp: smpTruk },
            motor: { count: motor, smp: smpMotor },
            totalKendaraan: mobil + bus + truk + motor,
            totalSMPRaw: totalSMP,
            durasiMenit,
            faktorJam
        }
    };
};

// Hitung Derajat Jenuh (DJ)
// Rumus: DJ = Q / C
const hitungDerajatJenuh = (volume, kapasitas) => {
    if (kapasitas <= 0) return 0;
    const dj = volume / kapasitas;
    return Math.min(dj, 2); // Cap at 2 for extreme cases
};

// Tentukan Level of Service (LOS)
const tentukanLOS = (dj) => {
    if (dj <= 0.20) return 'A';
    if (dj <= 0.44) return 'B';
    if (dj <= 0.72) return 'C';
    if (dj <= 0.84) return 'D';
    if (dj <= 0.92) return 'E';
    return 'F';
};

// Controller: Hitung dari data manual/CSV
exports.hitungManual = async (req, res) => {
    try {
        const {
            // Data jalan
            namaRuas,
            tipeJalan = '4/2 D',
            jumlahLajur = 2,
            lebarLajur = 3.5,
            faktorPemisah = '50-50',
            hambatanSamping = 'rendah',
            ukuranKota = 'besar',
            // Data kendaraan
            mobil = 0,
            bus = 0,
            truk = 0,
            motor = 0,
            // Durasi observasi dalam menit
            durasiMenit = 60,
            waktuObservasi = ''
        } = req.body;

        // Validasi input
        if (!namaRuas) {
            return res.status(400).json({
                success: false,
                message: 'Nama ruas jalan wajib diisi'
            });
        }

        // Hitung kapasitas
        const kapasitasResult = hitungKapasitas({
            tipeJalan,
            jumlahLajur,
            lebarLajur,
            faktorPemisah,
            hambatanSamping,
            ukuranKota
        });

        // Hitung volume SMP
        const volumeResult = hitungVolumeSMP(
            { mobil: parseInt(mobil), bus: parseInt(bus), truk: parseInt(truk), motor: parseInt(motor) },
            parseFloat(durasiMenit)
        );

        // Hitung derajat jenuh
        const dj = hitungDerajatJenuh(volumeResult.volumeSMP, kapasitasResult.kapasitas);

        // Tentukan LOS
        const los = tentukanLOS(dj);
        const losInfo = PKJI_CONSTANTS.losThresholds[los];

        // Simpan ke database (opsional)
        const perhitungan = new Perhitungan({
            userId: req.user.id || req.user._id,
            idDeteksi: null, // Manual calculation
            idVideo: null,
            jumlahMobil: parseInt(mobil) + parseInt(bus) + parseInt(truk),
            jumlahMotor: parseInt(motor),
            totalKendaraan: parseInt(mobil) + parseInt(bus) + parseInt(truk) + parseInt(motor),
            DJ: parseFloat(dj.toFixed(4)),
            LOS: los,
            metrics: {
                flowRate: volumeResult.volumeSMP,
                namaRuas,
                tipeJalan,
                kapasitas: kapasitasResult.kapasitas,
                durasiMenit: parseFloat(durasiMenit),
                waktuObservasi
            }
        });

        await perhitungan.save();

        res.status(200).json({
            success: true,
            message: 'Perhitungan berhasil',
            data: {
                perhitunganId: perhitungan._id,
                input: {
                    namaRuas,
                    tipeJalan,
                    jumlahLajur,
                    lebarLajur,
                    faktorPemisah,
                    hambatanSamping,
                    ukuranKota,
                    kendaraan: { mobil, bus, truk, motor },
                    durasiMenit,
                    waktuObservasi
                },
                hasil: {
                    kapasitas: kapasitasResult.kapasitas,
                    kapasitasDetail: kapasitasResult.detail,
                    volume: volumeResult.volumeSMP,
                    volumeDetail: volumeResult.detail,
                    derajatJenuh: parseFloat(dj.toFixed(4)),
                    los,
                    losDescription: losInfo.desc,
                    kondisi: dj > 0.85 ? 'Tidak Stabil' : dj > 0.72 ? 'Mendekati Tidak Stabil' : 'Stabil'
                }
            }
        });

    } catch (error) {
        logger.error('Perhitungan error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal melakukan perhitungan',
            error: error.message
        });
    }
};

// Controller: Hitung dari hasil deteksi YOLO
exports.hitungDariDeteksi = async (req, res) => {
    try {
        const { deteksiId } = req.params;
        const {
            // Data jalan (wajib dari user karena tidak ada di deteksi)
            namaRuas,
            tipeJalan = '4/2 D',
            jumlahLajur = 2,
            lebarLajur = 3.5,
            faktorPemisah = '50-50',
            hambatanSamping = 'rendah',
            ukuranKota = 'besar'
        } = req.body;

        // Cari data deteksi
        const deteksi = await DeteksiYOLO.findById(deteksiId);
        if (!deteksi) {
            return res.status(404).json({
                success: false,
                message: 'Data deteksi tidak ditemukan'
            });
        }

        if (deteksi.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Deteksi belum selesai diproses'
            });
        }

        // Ambil data kendaraan dari counting data
        const countingData = deteksi.countingData || {};
        const laneKiri = countingData.laneKiri || {};
        const laneKanan = countingData.laneKanan || {};

        // Total per jenis kendaraan
        const mobil = (laneKiri.mobil || 0) + (laneKanan.mobil || 0);
        const bus = (laneKiri.bus || 0) + (laneKanan.bus || 0);
        const truk = (laneKiri.truk || 0) + (laneKanan.truk || 0);
        const motor = 0; // Tidak ada motor di model saat ini

        // Hitung durasi video dalam menit
        const durasiMenit = deteksi.processingTime ? Math.max(1, deteksi.processingTime / 60) : 60;

        // Hitung kapasitas
        const kapasitasResult = hitungKapasitas({
            tipeJalan,
            jumlahLajur,
            lebarLajur,
            faktorPemisah,
            hambatanSamping,
            ukuranKota
        });

        // Hitung volume SMP
        const volumeResult = hitungVolumeSMP(
            { mobil, bus, truk, motor },
            durasiMenit
        );

        // Hitung derajat jenuh
        const dj = hitungDerajatJenuh(volumeResult.volumeSMP, kapasitasResult.kapasitas);

        // Tentukan LOS
        const los = tentukanLOS(dj);
        const losInfo = PKJI_CONSTANTS.losThresholds[los];

        // Simpan perhitungan
        const perhitungan = new Perhitungan({
            userId: req.user.id || req.user._id,
            idDeteksi: deteksi._id,
            idVideo: deteksi.idVideo,
            jumlahMobil: mobil + bus + truk,
            jumlahMotor: motor,
            totalKendaraan: mobil + bus + truk + motor,
            DJ: parseFloat(dj.toFixed(4)),
            LOS: los,
            metrics: {
                flowRate: volumeResult.volumeSMP,
                namaRuas,
                tipeJalan,
                kapasitas: kapasitasResult.kapasitas,
                durasiMenit,
                deteksiId: deteksi._id
            }
        });

        await perhitungan.save();

        res.status(200).json({
            success: true,
            message: 'Perhitungan dari deteksi berhasil',
            data: {
                perhitunganId: perhitungan._id,
                deteksiId: deteksi._id,
                videoFileName: deteksi.videoFileName,
                input: {
                    namaRuas,
                    tipeJalan,
                    jumlahLajur,
                    lebarLajur,
                    countingData: {
                        mobil,
                        bus,
                        truk,
                        motor,
                        total: mobil + bus + truk + motor
                    },
                    durasiMenit
                },
                hasil: {
                    kapasitas: kapasitasResult.kapasitas,
                    kapasitasDetail: kapasitasResult.detail,
                    volume: volumeResult.volumeSMP,
                    volumeDetail: volumeResult.detail,
                    derajatJenuh: parseFloat(dj.toFixed(4)),
                    los,
                    losDescription: losInfo.desc,
                    kondisi: dj > 0.85 ? 'Tidak Stabil' : dj > 0.72 ? 'Mendekati Tidak Stabil' : 'Stabil'
                }
            }
        });

    } catch (error) {
        logger.error('Perhitungan dari deteksi error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal melakukan perhitungan',
            error: error.message
        });
    }
};

// Controller: Get daftar perhitungan
exports.getList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role;

        // Admin bisa lihat semua data, surveyor hanya data sendiri
        const filter = userRole === 'admin' ? {} : { userId };

        const [perhitungan, total] = await Promise.all([
            Perhitungan.find(filter)
                .populate('idDeteksi', 'videoFileName status countingData')
                .populate('userId', 'namaUser') // Populate user info untuk admin
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Perhitungan.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: perhitungan,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get perhitungan list error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar perhitungan',
            error: error.message
        });
    }
};

// Controller: Get detail perhitungan
exports.getDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const perhitungan = await Perhitungan.findById(id)
            .populate('idDeteksi', 'videoFileName status countingData cloudinaryVideoUrl processingTime');

        if (!perhitungan) {
            return res.status(404).json({
                success: false,
                message: 'Perhitungan tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            data: perhitungan
        });

    } catch (error) {
        logger.error('Get perhitungan detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail perhitungan',
            error: error.message
        });
    }
};

// Controller: Hapus perhitungan
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const perhitungan = await Perhitungan.findByIdAndDelete(id);

        if (!perhitungan) {
            return res.status(404).json({
                success: false,
                message: 'Perhitungan tidak ditemukan'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Perhitungan berhasil dihapus'
        });

    } catch (error) {
        logger.error('Delete perhitungan error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus perhitungan',
            error: error.message
        });
    }
};

// Controller: Get referensi PKJI
exports.getReferensi = async (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            tipeJalan: Object.keys(PKJI_CONSTANTS.kapasitasDasar),
            lebarLajur: Object.keys(PKJI_CONSTANTS.faktorLebar),
            faktorPemisah: Object.keys(PKJI_CONSTANTS.faktorPemisah),
            hambatanSamping: Object.keys(PKJI_CONSTANTS.faktorHambatan),
            ukuranKota: Object.keys(PKJI_CONSTANTS.faktorKota),
            emp: PKJI_CONSTANTS.emp,
            losThresholds: PKJI_CONSTANTS.losThresholds
        }
    });
};

// Controller: Get daftar deteksi yang bisa dihitung
exports.getDeteksiAvailable = async (req, res) => {
    try {
        const deteksiList = await DeteksiYOLO.find({ status: 'completed' })
            .select('videoFileName countingData processingTime createdAt cloudinaryVideoUrl')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            data: deteksiList.map(d => ({
                _id: d._id,
                videoFileName: d.videoFileName,
                totalKendaraan: d.countingData?.totalCounted || 0,
                laneKiri: d.countingData?.laneKiri || {},
                laneKanan: d.countingData?.laneKanan || {},
                processingTime: d.processingTime,
                createdAt: d.createdAt,
                hasVideo: !!d.cloudinaryVideoUrl
            }))
        });

    } catch (error) {
        logger.error('Get deteksi available error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar deteksi',
            error: error.message
        });
    }
};

// =========================================
// PERHITUNGAN SEDERHANA (Rumus User Request)
// =========================================
// Parameter tetap:
// - Tipe Jalan: 4/2 D (4 lajur 2 arah dengan median)
// - n = 2 (jumlah lajur per arah)
// - FCLE = 1 (faktor lebar efektif)
// - C0 = 2500 SMP/jam (kapasitas dasar per lajur)
// - Lebar Lajur = 3.5 m
// - Kecepatan Dasar = 88 km/jam
// - Faktor Lebar Efektif = 0
//
// Rumus:
// C = n × C0 × FCLE = 2 × 2500 × 1 = 5,000 SMP/jam
// DJ = Q / C
// LOS berdasarkan threshold DJ

const SIMPLE_CONSTANTS = {
    tipeJalan: '4/2 D',
    n: 2,              // Jumlah lajur per arah
    C0: 2500,          // Kapasitas dasar per lajur (SMP/jam)
    FCLE: 1,           // Faktor lebar efektif
    lebarLajur: 3.5,   // meter
    kecepatanDasar: 88, // km/jam
    
    // Nilai EMP (Ekuivalen Mobil Penumpang)
    emp: {
        mobil: 1.0,    // LV (Light Vehicle) 
        bus: 1.2,      // HV (Heavy Vehicle) - Bus
        truk: 1.3,     // HV (Heavy Vehicle) - Truk
        motor: 0.25    // MC (Motorcycle) - jika ada
    },
    
    // Threshold LOS berdasarkan DJ
    losThresholds: {
        'A': { max: 0.20, desc: 'Arus bebas dengan volume lalu lintas rendah dan kecepatan tinggi. Pengemudi dapat memilih kecepatan yang diinginkan.' },
        'B': { max: 0.44, desc: 'Arus stabil dengan volume lalu lintas sedang dan kecepatan mulai dibatasi oleh kondisi lalu lintas.' },
        'C': { max: 0.72, desc: 'Arus stabil dengan volume lalu lintas lebih tinggi. Kecepatan dan gerak kendaraan dibatasi.' },
        'D': { max: 0.84, desc: 'Arus mendekati tidak stabil dengan volume lalu lintas tinggi. Kecepatan masih dapat dipertahankan tapi sangat terpengaruh perubahan kondisi.' },
        'E': { max: 0.92, desc: 'Arus tidak stabil dengan volume lalu lintas mendekati kapasitas. Sering terjadi kemacetan.' },
        'F': { max: Infinity, desc: 'Arus dipaksakan (forced flow). Kecepatan sangat rendah dan antrian panjang. Sistem mengalami kemacetan total.' }
    }
};

// Hitung Kapasitas Sederhana
const hitungKapasitasSederhana = () => {
    const { n, C0, FCLE } = SIMPLE_CONSTANTS;
    const kapasitas = n * C0 * FCLE;
    return {
        kapasitas,
        detail: { n, C0, FCLE }
    };
};

// Hitung Volume SMP dari data kendaraan
const hitungVolumeSMPSederhana = (kendaraan, durasiMenit = 60) => {
    const { mobil = 0, bus = 0, truk = 0, motor = 0 } = kendaraan;
    const emp = SIMPLE_CONSTANTS.emp;
    
    // Konversi ke SMP
    const smpMobil = mobil * emp.mobil;
    const smpBus = bus * emp.bus;
    const smpTruk = truk * emp.truk;
    const smpMotor = motor * emp.motor;
    
    const totalSMP = smpMobil + smpBus + smpTruk + smpMotor;
    
    // Konversi ke per jam
    const faktorJam = 60 / durasiMenit;
    const volumePerJam = totalSMP * faktorJam;

    return {
        volumeSMP: Math.round(volumePerJam),
        detail: {
            mobil: { count: mobil, smp: smpMobil },
            bus: { count: bus, smp: smpBus },
            truk: { count: truk, smp: smpTruk },
            motor: { count: motor, smp: smpMotor },
            totalKendaraan: mobil + bus + truk + motor,
            totalSMPRaw: totalSMP,
            durasiMenit,
            faktorJam
        }
    };
};

// Tentukan LOS dari DJ
const tentukanLOSSederhana = (dj) => {
    if (dj <= 0.20) return 'A';
    if (dj <= 0.44) return 'B';
    if (dj <= 0.72) return 'C';
    if (dj <= 0.84) return 'D';
    if (dj <= 0.92) return 'E';
    return 'F';
};

// Generate kesimpulan berdasarkan LOS
const generateKesimpulan = (los, dj, namaRuas, volumeSMP, kapasitas) => {
    const losDesc = SIMPLE_CONSTANTS.losThresholds[los].desc;
    
    let rekomendasi = '';
    switch(los) {
        case 'A':
        case 'B':
            rekomendasi = 'Kondisi jalan sangat baik, tidak diperlukan intervensi khusus.';
            break;
        case 'C':
            rekomendasi = 'Kondisi jalan masih dapat diterima, namun perlu pemantauan berkala untuk mengantisipasi peningkatan volume lalu lintas.';
            break;
        case 'D':
            rekomendasi = 'Perlu dilakukan manajemen lalu lintas untuk mencegah penurunan kinerja jalan.';
            break;
        case 'E':
            rekomendasi = 'Diperlukan tindakan segera berupa pengaturan lalu lintas atau pengalihan rute untuk menghindari kemacetan.';
            break;
        case 'F':
            rekomendasi = 'Kondisi sangat kritis! Diperlukan intervensi serius seperti pelebaran jalan, pembangunan jalan alternatif, atau pembatasan kendaraan.';
            break;
    }
    
    return {
        ringkasan: `Ruas jalan "${namaRuas}" memiliki Level of Service (LOS) ${los} dengan Derajat Kejenuhan (DJ) sebesar ${dj.toFixed(4)}.`,
        keterangan: losDesc,
        analisis: `Volume lalu lintas (Q) sebesar ${volumeSMP} SMP/jam dengan kapasitas jalan (C) sebesar ${kapasitas} SMP/jam menghasilkan rasio volume terhadap kapasitas sebesar ${(dj * 100).toFixed(2)}%.`,
        rekomendasi
    };
};

// Controller: Perhitungan Sederhana dari Deteksi YOLO
exports.hitungSederhana = async (req, res) => {
    try {
        const { deteksiId } = req.params;
        const { namaRuas = 'Ruas Jalan', waktuObservasi = '' } = req.body;

        // Cari data deteksi
        const deteksi = await DeteksiYOLO.findById(deteksiId);
        if (!deteksi) {
            return res.status(404).json({
                success: false,
                message: 'Data deteksi tidak ditemukan'
            });
        }

        if (deteksi.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Deteksi belum selesai diproses'
            });
        }

        // Ambil data kendaraan dari counting data
        const countingData = deteksi.countingData || {};
        const laneKiri = countingData.laneKiri || {};
        const laneKanan = countingData.laneKanan || {};

        // Total per jenis kendaraan (gabungan 2 lajur)
        const mobil = (laneKiri.mobil || 0) + (laneKanan.mobil || 0);
        const bus = (laneKiri.bus || 0) + (laneKanan.bus || 0);
        const truk = (laneKiri.truk || 0) + (laneKanan.truk || 0);
        const motor = 0; // Model saat ini tidak mendeteksi motor

        // Hitung durasi video dalam menit (dari processingTime atau frameCount/fps)
        // Asumsi: processingTime dalam detik adalah waktu proses, bukan durasi video
        // Untuk perhitungan volume per jam, gunakan durasi observasi
        // Default: 60 menit (1 jam) jika tidak ada info durasi video
        let durasiMenit = 60;
        if (deteksi.processingTime && deteksi.processingTime > 0) {
            // Jika ada processing time, gunakan sebagai estimasi durasi video (dalam menit)
            durasiMenit = Math.max(1, Math.ceil(deteksi.processingTime / 60));
        }

        // Hitung Kapasitas (nilai tetap)
        const kapasitasResult = hitungKapasitasSederhana();

        // Hitung Volume SMP
        const volumeResult = hitungVolumeSMPSederhana(
            { mobil, bus, truk, motor },
            durasiMenit
        );

        // Hitung Derajat Jenuh (DJ)
        const dj = volumeResult.volumeSMP / kapasitasResult.kapasitas;
        const djCapped = Math.min(dj, 2); // Cap at 2 for display

        // Tentukan LOS
        const los = tentukanLOSSederhana(djCapped);
        const losInfo = SIMPLE_CONSTANTS.losThresholds[los];

        // Generate kesimpulan
        const kesimpulan = generateKesimpulan(los, djCapped, namaRuas, volumeResult.volumeSMP, kapasitasResult.kapasitas);

        // Simpan ke database
        const perhitungan = new Perhitungan({
            userId: req.user.id || req.user._id,
            idDeteksi: deteksi._id,
            idVideo: deteksi.idVideo,
            jumlahMobil: mobil + bus + truk,
            jumlahMotor: motor,
            totalKendaraan: mobil + bus + truk + motor,
            DJ: parseFloat(djCapped.toFixed(4)),
            LOS: los,
            metrics: {
                flowRate: volumeResult.volumeSMP,
                namaRuas,
                tipeJalan: SIMPLE_CONSTANTS.tipeJalan,
                kapasitas: kapasitasResult.kapasitas,
                durasiMenit,
                waktuObservasi,
                deteksiId: deteksi._id,
                mode: 'sederhana' // Tandai sebagai perhitungan sederhana
            }
        });

        await perhitungan.save();

        // Response
        res.status(200).json({
            success: true,
            message: 'Perhitungan sederhana berhasil',
            data: {
                perhitunganId: perhitungan._id,
                deteksiId: deteksi._id,
                videoFileName: deteksi.videoFileName,
                // Parameter Tetap
                parameterTetap: {
                    tipeJalan: SIMPLE_CONSTANTS.tipeJalan,
                    jenisKendaraan: 'Mobil Penumpang = 1 SMP',
                    n: SIMPLE_CONSTANTS.n,
                    FCLE: SIMPLE_CONSTANTS.FCLE,
                    C0: SIMPLE_CONSTANTS.C0,
                    lebarLajur: SIMPLE_CONSTANTS.lebarLajur,
                    kecepatanDasar: SIMPLE_CONSTANTS.kecepatanDasar,
                    rumusKapasitas: 'C = n × C0 × FCLE',
                    rumusDJ: 'DJ = Q / C'
                },
                // Input dari YOLO
                inputYOLO: {
                    mobil,
                    bus,
                    truk,
                    motor,
                    totalKendaraan: mobil + bus + truk + motor,
                    durasiMenit
                },
                // Hasil Perhitungan
                hasil: {
                    // Volume (Q)
                    volume: volumeResult.volumeSMP,
                    volumeDetail: volumeResult.detail,
                    // Kapasitas (C)
                    kapasitas: kapasitasResult.kapasitas,
                    kapasitasDetail: kapasitasResult.detail,
                    // Derajat Jenuh (DJ)
                    derajatJenuh: parseFloat(djCapped.toFixed(4)),
                    derajatJenuhPersen: `${(djCapped * 100).toFixed(2)}%`,
                    // Level of Service (LOS)
                    los,
                    losDescription: losInfo.desc,
                    // Kondisi
                    kondisi: djCapped > 0.92 ? 'Macet Total' : 
                             djCapped > 0.84 ? 'Tidak Stabil' : 
                             djCapped > 0.72 ? 'Mendekati Tidak Stabil' : 
                             djCapped > 0.44 ? 'Stabil' : 'Bebas'
                },
                // Kesimpulan
                kesimpulan
            }
        });

    } catch (error) {
        logger.error('Perhitungan sederhana error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal melakukan perhitungan sederhana',
            error: error.message
        });
    }
};

// Controller: Get konstanta perhitungan sederhana
exports.getSimpleConstants = async (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            ...SIMPLE_CONSTANTS,
            kapasitasTotal: SIMPLE_CONSTANTS.n * SIMPLE_CONSTANTS.C0 * SIMPLE_CONSTANTS.FCLE
        }
    });
};
