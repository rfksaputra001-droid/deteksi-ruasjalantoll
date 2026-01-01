require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const logger = require('../src/utils/logger');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('✅ MongoDB Connected');
    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

const createSurveyor = async () => {
    try {
        await connectDB();

        const surveyorEmail = process.env.DEFAULT_SURVEYOR_EMAIL || 'surveyor@yolo.com';
        const surveyorPassword = process.env.DEFAULT_SURVEYOR_PASSWORD || 'Surveyor123!';
        const surveyorName = process.env.DEFAULT_SURVEYOR_NAME || 'Surveyor';

        // Check if surveyor exists
        const existingSurveyor = await User.findOne({ emailUser: surveyorEmail });

        if (existingSurveyor) {
            logger.info('⚠️  Surveyor user already exists');
            logger.info(`Email: ${surveyorEmail}`);
            process.exit(0);
        }

        // Create surveyor
        const surveyor = await User.create({
            namaUser: surveyorName,
            emailUser: surveyorEmail,
            passwordUser: surveyorPassword,
            role: 'surveyor',
            isActive: true
        });

        logger.info('✅ Surveyor user created successfully!');
        logger.info('═══════════════════════════════════');
        logger.info(`Email: ${surveyorEmail}`);
        logger.info(`Password: ${surveyorPassword}`);
        logger.info(`Role: surveyor`);
        logger.info('═══════════════════════════════════');
        logger.info('Akses: Deteksi, Perhitungan, Histori (tidak bisa kelola akun)');

        process.exit(0);

    } catch (error) {
        logger.error('❌ Error creating surveyor:', error);
        process.exit(1);
    }
};

createSurveyor();
