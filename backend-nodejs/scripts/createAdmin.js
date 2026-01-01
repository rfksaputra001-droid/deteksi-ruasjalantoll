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

const createAdmin = async () => {
    try {
        await connectDB();

        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@yolo.com';
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
        const adminName = process.env.DEFAULT_ADMIN_NAME || 'Super Admin';

        // Check if admin exists
        const existingAdmin = await User.findOne({ emailUser: adminEmail });

        if (existingAdmin) {
            logger.info('⚠️  Admin user already exists');
            logger.info(`Email: ${adminEmail}`);
            process.exit(0);
        }

        // Create admin
        const admin = await User.create({
            namaUser: adminName,
            emailUser: adminEmail,
            passwordUser: adminPassword,
            role: 'admin',
            isActive: true
        });

        logger.info('✅ Admin user created successfully!');
        logger.info('═══════════════════════════════════');
        logger.info(`Email: ${adminEmail}`);
        logger.info(`Password: ${adminPassword}`);
        logger.info('═══════════════════════════════════');
        logger.info('⚠️  Please change the password after first login!');

        process.exit(0);

    } catch (error) {
        logger.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
