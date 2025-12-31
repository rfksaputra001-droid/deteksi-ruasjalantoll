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

const createUser = async () => {
    try {
        await connectDB();

        const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@yolo.com';
        const userPassword = process.env.DEFAULT_USER_PASSWORD || 'User123!';
        const userName = process.env.DEFAULT_USER_NAME || 'User Biasa';

        // Check if user exists
        const existingUser = await User.findOne({ emailUser: userEmail });

        if (existingUser) {
            logger.info('⚠️  User already exists');
            logger.info(`Email: ${userEmail}`);
            process.exit(0);
        }

        // Create user
        const user = await User.create({
            namaUser: userName,
            emailUser: userEmail,
            passwordUser: userPassword,
            role: 'user',
            isActive: true
        });

        logger.info('✅ User created successfully!');
        logger.info('═══════════════════════════════════');
        logger.info(`Email: ${userEmail}`);
        logger.info(`Password: ${userPassword}`);
        logger.info(`Role: user`);
        logger.info('═══════════════════════════════════');
        logger.info('Akses: Hanya Dashboard (read-only)');

        process.exit(0);

    } catch (error) {
        logger.error('❌ Error creating user:', error);
        process.exit(1);
    }
};

createUser();
