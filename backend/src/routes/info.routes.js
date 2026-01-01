const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const router = express.Router();

// Helper function to find Python executable
function findPythonExecutable() {
  const possiblePaths = [
    '/opt/venv/bin/python',
    '/usr/bin/python3',
    '/usr/bin/python',
    '/usr/local/bin/python3',
    '/usr/local/bin/python'
  ];
  
  for (const pyPath of possiblePaths) {
    try {
      if (fs.existsSync(pyPath)) {
        return pyPath;
      }
    } catch (e) {
      // Continue
    }
  }
  return '/opt/venv/bin/python'; // Default fallback
}

// Docker Environment Debug Endpoint
router.get('/debug', async (req, res) => {
  try {
    const pythonExecutable = findPythonExecutable();
    
    // Check Python executable
    const pythonExists = pythonExecutable.startsWith('/') ? fs.existsSync(pythonExecutable) : true;
    
    // Get system info
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pythonExecutable: pythonExecutable,
      pythonExists: pythonExists,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PYTHON_ENV: process.env.PYTHON_ENV,
        PYTHONPATH: process.env.PYTHONPATH,
        VIRTUAL_ENV: process.env.VIRTUAL_ENV,
        PATH: process.env.PATH,
        OPENCV_LOG_LEVEL: process.env.OPENCV_LOG_LEVEL,
        QT_QPA_PLATFORM: process.env.QT_QPA_PLATFORM
      },
      directories: {
        cwd: process.cwd(),
        tmpExists: fs.existsSync('/tmp'),
        appExists: fs.existsSync('/app'),
        venvExists: fs.existsSync('/opt/venv'),
        matplotlibExists: fs.existsSync('/tmp/matplotlib')
      }
    };
    
    // Test Python imports
    const pythonTest = `
try:
    import sys
    print(f"Python: {sys.version}")
    
    import cv2
    print(f"OpenCV: {cv2.__version__}")
    
    import numpy as np
    print(f"NumPy: {np.__version__}")
    
    import torch
    print(f"PyTorch: {torch.__version__}")
    
    from ultralytics import YOLO
    print("YOLO: OK")
    
    print("ALL_IMPORTS_SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
`;
    
    const python = spawn(pythonExecutable, ['-c', pythonTest], {
      timeout: 30000,
      cwd: '/app',
      env: {
        ...process.env,
        PYTHONPATH: process.env.PYTHONPATH || '/app:/opt/venv/lib/python3.11/site-packages',
        OPENCV_LOG_LEVEL: 'ERROR',
        MPLCONFIGDIR: '/tmp/matplotlib',
        QT_QPA_PLATFORM: 'offscreen',
        PATH: '/opt/venv/bin:/usr/local/bin:/usr/bin:/bin:' + (process.env.PATH || '')
      }
    });
    
    let pythonOutput = '';
    let pythonError = '';
    
    python.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      pythonError += data.toString();
    });
    
    python.on('close', (code) => {
      res.json({
        success: true,
        system: systemInfo,
        python: {
          exitCode: code,
          stdout: pythonOutput,
          stderr: pythonError
        },
        timestamp: new Date().toISOString()
      });
    });
    
    python.on('error', (error) => {
      res.json({
        success: false,
        system: systemInfo,
        python: {
          error: error.message
        },
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Welcome page dengan dokumentasi lengkap
router.get('/', (req, res) => {
    const protocol = req.protocol;
    const host = req.hostname;
    const baseUrl = `${protocol}://${host}:${process.env.PORT || 3000}`;
    
    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YOLO Vehicle Detection API</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 40px 20px;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .header {
                background: white;
                border-radius: 12px;
                padding: 40px;
                margin-bottom: 30px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                text-align: center;
            }
            
            .header h1 {
                font-size: 42px;
                margin-bottom: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .header p {
                color: #666;
                font-size: 18px;
                margin-bottom: 20px;
            }
            
            .status {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: 600;
                margin-bottom: 20px;
            }
            
            .status.active {
                background: #52c41a;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .info-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .info-card h3 {
                color: #667eea;
                margin-bottom: 10px;
                font-size: 16px;
            }
            
            .info-card p {
                color: #666;
                font-size: 14px;
                word-break: break-all;
                font-family: 'Courier New', monospace;
            }
            
            .endpoints-section {
                background: white;
                border-radius: 12px;
                padding: 40px;
                margin-bottom: 30px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            }
            
            .endpoints-section h2 {
                color: #333;
                margin-bottom: 30px;
                font-size: 28px;
                padding-bottom: 15px;
                border-bottom: 3px solid #667eea;
            }
            
            .endpoint-group {
                margin-bottom: 30px;
            }
            
            .endpoint-group h3 {
                color: #667eea;
                margin-bottom: 15px;
                font-size: 20px;
            }
            
            .endpoint {
                background: #f5f5f5;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 6px;
                border-left: 4px solid #667eea;
                font-family: 'Courier New', monospace;
            }
            
            .method {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 4px;
                color: white;
                font-weight: 600;
                margin-right: 10px;
                font-size: 12px;
            }
            
            .get { background: #52c41a; }
            .post { background: #1890ff; }
            .put { background: #faad14; }
            .delete { background: #f5222d; }
            
            .url {
                color: #333;
                font-size: 13px;
            }
            
            .features {
                background: white;
                border-radius: 12px;
                padding: 40px;
                margin-bottom: 30px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            }
            
            .features h2 {
                color: #333;
                margin-bottom: 30px;
                font-size: 28px;
                padding-bottom: 15px;
                border-bottom: 3px solid #667eea;
            }
            
            .features-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
            }
            
            .feature-item {
                padding: 15px;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }
            
            .feature-item h4 {
                color: #667eea;
                margin-bottom: 8px;
            }
            
            .feature-item p {
                color: #666;
                font-size: 13px;
            }
            
            .footer {
                background: white;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                color: #666;
            }
            
            .links {
                margin-top: 20px;
            }
            
            .links a {
                display: inline-block;
                margin: 0 10px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-size: 14px;
                transition: transform 0.2s;
            }
            
            .links a:hover {
                transform: translateY(-2px);
            }
            
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-top: 20px;
            }
            
            .stat-item {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            }
            
            .stat-value {
                font-size: 32px;
                font-weight: bold;
                display: block;
            }
            
            .stat-label {
                font-size: 12px;
                margin-top: 5px;
                opacity: 0.9;
            }
            
            @media (max-width: 768px) {
                .header h1 {
                    font-size: 32px;
                }
                
                .endpoints-section,
                .features,
                .header {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="status active">🟢 SERVER RUNNING</div>
                <h1>🚗 YOLO Vehicle Detection API</h1>
                <p>Sistem Pendeteksian Kendaraan dengan YOLO AI</p>
                
                <div class="stats">
                    <div class="stat-item">
                        <span class="stat-value">1.0.0</span>
                        <span class="stat-label">Version</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">6</span>
                        <span class="stat-label">API Modules</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">15+</span>
                        <span class="stat-label">Endpoints</span>
                    </div>
                </div>
            </div>
            
            <!-- Server Info -->
            <div class="info-grid">
                <div class="info-card">
                    <h3>📍 Base URL</h3>
                    <p>${baseUrl}</p>
                </div>
                <div class="info-card">
                    <h3>📦 API Base</h3>
                    <p>${baseUrl}/api</p>
                </div>
                <div class="info-card">
                    <h3>💻 Environment</h3>
                    <p>${process.env.NODE_ENV || 'development'}</p>
                </div>
                <div class="info-card">
                    <h3>⏱️ Uptime</h3>
                    <p>${Math.floor(process.uptime())}s</p>
                </div>
            </div>
            
            <!-- Features -->
            <div class="features">
                <h2>✨ Features</h2>
                <div class="features-grid">
                    <div class="feature-item">
                        <h4>🔐 Authentication</h4>
                        <p>JWT-based authentication system</p>
                    </div>
                    <div class="feature-item">
                        <h4>📹 Video Processing</h4>
                        <p>Upload & process video files</p>
                    </div>
                    <div class="feature-item">
                        <h4>🚗 Vehicle Detection</h4>
                        <p>YOLO AI vehicle detection</p>
                    </div>
                    <div class="feature-item">
                        <h4>📊 Analytics</h4>
                        <p>Detailed statistics & reports</p>
                    </div>
                    <div class="feature-item">
                        <h4>💾 History</h4>
                        <p>Complete detection history</p>
                    </div>
                    <div class="feature-item">
                        <h4>🛡️ Security</h4>
                        <p>CORS, Rate Limiting, Validation</p>
                    </div>
                </div>
            </div>
            
            <!-- API Endpoints -->
            <div class="endpoints-section">
                <h2>📚 API Endpoints</h2>
                
                <div class="endpoint-group">
                    <h3>🔐 Authentication</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="url">/api/auth/login</span>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="url">/api/auth/register</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/auth/profile</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>📊 Dashboard</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/dashboard/stats</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/dashboard/recent-detections</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>📹 Video Detection</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="url">/api/deteksi/upload</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/deteksi/list</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/deteksi/result/:id</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>📜 History</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/histori/list</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/histori/detail/:id</span>
                    </div>
                    <div class="endpoint">
                        <span class="method delete">DELETE</span>
                        <span class="url">/api/histori/:id</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>🎥 Videos</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/video/list</span>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="url">/api/video/upload</span>
                    </div>
                    <div class="endpoint">
                        <span class="method delete">DELETE</span>
                        <span class="url">/api/video/:id</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>📊 Calculations</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/perhitungan/list</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/perhitungan/detail/:id</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>👨‍💼 Admin</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/api/admin/users</span>
                    </div>
                    <div class="endpoint">
                        <span class="method put">PUT</span>
                        <span class="url">/api/admin/user/:id</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>🏥 Health Check</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="url">/health</span>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <h3>🚀 Quick Start</h3>
                <div class="links">
                    <a href="${baseUrl}/health">Health Check</a>
                    <a href="http://localhost:5173" target="_blank">Frontend (5173)</a>
                </div>
                <p style="margin-top: 20px; font-size: 12px;">
                    Backend running on port 3000 • YOLO Vehicle Detection System • v1.0.0
                </p>
                <p style="margin-top: 10px; font-size: 11px; color: #999;">
                    Created on: December 27, 2025 • Status: Production Ready ✅
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
});

module.exports = router;
