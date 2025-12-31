require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');
const { startCleanupWorker } = require('./src/workers/cleanupWorker');

// Function to find available port
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', () => {
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
}

let PORT = parseInt(process.env.PORT) || 3000;

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);
    
    // Join room for specific detection
    socket.on('join-detection', (detectionId) => {
        socket.join(`detection-${detectionId}`);
        logger.info(`📺 Client ${socket.id} joined detection room: ${detectionId}`);
    });
    
    // Leave room
    socket.on('leave-detection', (detectionId) => {
        socket.leave(`detection-${detectionId}`);
        logger.info(`📺 Client ${socket.id} left detection room: ${detectionId}`);
    });
    
    socket.on('disconnect', () => {
        logger.info(`❌ Client disconnected: ${socket.id}`);
    });
});

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB
connectDB();

// Cleanup worker disabled - data will be kept permanently
// startCleanupWorker();

// Start server with port conflict handling
async function startServer() {
  try {
    // Try to start server on the configured port
    server.listen(PORT, () => {
      const localhost = `http://localhost:${PORT}`;
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║          🚀 YOLO BACKEND SERVER STARTED 🚀         ║');
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log(`\n📍 Localhost: ${localhost}`);
      console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
      console.log(`\n⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📁 Upload directory ready`);
      console.log(`🤖 YOLO model ready`);
      console.log('\n✅ Server is ready to accept connections!\n');
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`\n⚠️  Port ${PORT} is already in use, finding available port...`);
      try {
        PORT = await findAvailablePort(PORT + 1);
        console.log(`✅ Found available port: ${PORT}`);
        startServer();
      } catch (portError) {
        console.error('❌ Could not find available port:', portError);
        process.exit(1);
      }
    } else {
      console.error('❌ Server startup error:', error);
      process.exit(1);
    }
  }
}

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`\n⚠️  Port ${PORT} is already in use, finding available port...`);
    try {
      PORT = await findAvailablePort(PORT + 1);
      console.log(`✅ Found available port: ${PORT}`);
      server.close();
      setTimeout(() => startServer(), 1000);
    } catch (portError) {
      console.error('❌ Could not find available port:', portError);
      process.exit(1);
    }
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('❌ UNHANDLED REJECTION! Shutting down...', err);
    server.close(() => {
        process.exit(1);
    });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
    logger.info('⚠️ SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('✅ Process terminated!');
    });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    logger.info('⚠️ SIGINT received. Shutting down gracefully...');
    server.close(() => {
        logger.info('✅ Process terminated!');
        process.exit(0);
    });
});