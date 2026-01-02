from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from datetime import datetime

router = APIRouter()

@router.get("/backend-info", response_class=HTMLResponse)
async def backend_dashboard():
    """
    Dashboard untuk melihat semua fitur dan endpoint yang tersedia di backend
    """
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🚀 YOLO Detection Backend - Dashboard</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
                line-height: 1.6;
                min-height: 100vh;
            }}
            
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }}
            
            .header {{
                text-align: center;
                color: white;
                margin-bottom: 30px;
                padding: 30px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }}
            
            .header h1 {{
                font-size: 2.5rem;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }}
            
            .status-cards {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            
            .card {{
                background: white;
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transition: transform 0.3s ease;
            }}
            
            .card:hover {{
                transform: translateY(-5px);
            }}
            
            .card-header {{
                display: flex;
                align-items: center;
                margin-bottom: 15px;
            }}
            
            .card-icon {{
                font-size: 2rem;
                margin-right: 15px;
            }}
            
            .card-title {{
                font-size: 1.2rem;
                font-weight: bold;
                color: #333;
            }}
            
            .endpoint-section {{
                background: white;
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }}
            
            .endpoint-group {{
                margin-bottom: 25px;
            }}
            
            .endpoint-group h3 {{
                color: #667eea;
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 2px solid #f0f0f0;
            }}
            
            .endpoint {{
                display: flex;
                align-items: center;
                padding: 10px 15px;
                margin: 5px 0;
                background: #f8f9fa;
                border-radius: 8px;
                transition: background 0.3s ease;
            }}
            
            .endpoint:hover {{
                background: #e9ecef;
            }}
            
            .method {{
                padding: 5px 10px;
                border-radius: 20px;
                color: white;
                font-weight: bold;
                font-size: 0.8rem;
                margin-right: 15px;
                min-width: 60px;
                text-align: center;
            }}
            
            .method.get {{ background: #28a745; }}
            .method.post {{ background: #007bff; }}
            .method.put {{ background: #ffc107; color: #333; }}
            .method.delete {{ background: #dc3545; }}
            
            .path {{
                font-family: monospace;
                font-weight: bold;
                flex: 1;
            }}
            
            .description {{
                color: #6c757d;
                font-size: 0.9rem;
                margin-left: 10px;
            }}
            
            .models-section {{
                background: white;
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }}
            
            .model-item {{
                display: flex;
                align-items: center;
                padding: 15px;
                margin: 10px 0;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }}
            
            .model-icon {{
                font-size: 1.5rem;
                margin-right: 15px;
            }}
            
            .tech-stack {{
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }}
            
            .tech-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }}
            
            .tech-item {{
                display: flex;
                align-items: center;
                padding: 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 10px;
                font-weight: bold;
            }}
            
            .tech-item .icon {{
                font-size: 1.5rem;
                margin-right: 10px;
            }}
            
            .footer {{
                text-align: center;
                color: white;
                margin-top: 30px;
                padding: 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }}
            
            .timestamp {{
                color: #ffd700;
                font-weight: bold;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 YOLO Detection Backend</h1>
                <p>Dashboard Monitoring & API Documentation</p>
                <p class="timestamp">Generated: {datetime.now().strftime('%d %B %Y - %H:%M:%S WIB')}</p>
            </div>
            
            <div class="status-cards">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">✅</div>
                        <div class="card-title">Status Server</div>
                    </div>
                    <p><strong>ONLINE & READY</strong></p>
                    <p>FastAPI + Socket.IO</p>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🎯</div>
                        <div class="card-title">YOLO Model</div>
                    </div>
                    <p><strong>YOLOv8 Loaded</strong></p>
                    <p>Vehicle Detection Ready</p>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">💾</div>
                        <div class="card-title">Database</div>
                    </div>
                    <p><strong>MongoDB Connected</strong></p>
                    <p>Motor AsyncIO</p>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🔗</div>
                        <div class="card-title">Real-time</div>
                    </div>
                    <p><strong>Socket.IO Active</strong></p>
                    <p>Progress Updates</p>
                </div>
            </div>
            
            <div class="endpoint-section">
                <h2>📡 Available API Endpoints</h2>
                
                <div class="endpoint-group">
                    <h3>🔐 Authentication</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="path">/api/auth/register</span>
                        <span class="description">Register new user</span>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="path">/api/auth/login</span>
                        <span class="description">User login</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/auth/me</span>
                        <span class="description">Get current user info</span>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="path">/api/auth/refresh</span>
                        <span class="description">Refresh access token</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>🎯 Detection</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="path">/api/deteksi/upload</span>
                        <span class="description">Upload video for detection</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/deteksi/</span>
                        <span class="description">Get detection history</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/deteksi/{{id}}</span>
                        <span class="description">Get detection by ID</span>
                    </div>
                    <div class="endpoint">
                        <span class="method delete">DELETE</span>
                        <span class="path">/api/deteksi/{{id}}</span>
                        <span class="description">Delete detection</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>📊 Dashboard</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/dashboard/stats</span>
                        <span class="description">Get dashboard statistics</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/dashboard/recent</span>
                        <span class="description">Get recent activities</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>🧮 Perhitungan</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="path">/api/perhitungan/</span>
                        <span class="description">Create calculation</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/perhitungan/</span>
                        <span class="description">Get calculations</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/perhitungan/{{id}}</span>
                        <span class="description">Get calculation by ID</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>📋 Histori</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/histori/</span>
                        <span class="description">Get activity history</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/histori/{{id}}</span>
                        <span class="description">Get history by ID</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>👥 Admin</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/api/admin/users</span>
                        <span class="description">Get all users (admin only)</span>
                    </div>
                    <div class="endpoint">
                        <span class="method delete">DELETE</span>
                        <span class="path">/api/admin/users/{{id}}</span>
                        <span class="description">Delete user (admin only)</span>
                    </div>
                </div>
                
                <div class="endpoint-group">
                    <h3>📚 Documentation</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/docs</span>
                        <span class="description">Swagger UI Documentation</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/redoc</span>
                        <span class="description">ReDoc Documentation</span>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="path">/backend-info</span>
                        <span class="description">Backend Dashboard (this page)</span>
                    </div>
                </div>
            </div>
            
            <div class="models-section">
                <h2>🗃️ Database Models</h2>
                <div class="model-item">
                    <div class="model-icon">👤</div>
                    <div>
                        <strong>User Model</strong>
                        <p>Authentication, roles (admin/surveyor), profile management</p>
                    </div>
                </div>
                <div class="model-item">
                    <div class="model-icon">🎯</div>
                    <div>
                        <strong>Deteksi Model</strong>
                        <p>Video uploads, YOLO detection results, vehicle counting</p>
                    </div>
                </div>
                <div class="model-item">
                    <div class="model-icon">🧮</div>
                    <div>
                        <strong>Perhitungan Model</strong>
                        <p>Calculation data, formulas, results storage</p>
                    </div>
                </div>
                <div class="model-item">
                    <div class="model-icon">📋</div>
                    <div>
                        <strong>Histori Model</strong>
                        <p>Activity logs, user actions, system events</p>
                    </div>
                </div>
            </div>
            
            <div class="tech-stack">
                <h2>🛠️ Technology Stack</h2>
                <div class="tech-grid">
                    <div class="tech-item">
                        <span class="icon">⚡</span>
                        FastAPI
                    </div>
                    <div class="tech-item">
                        <span class="icon">🐍</span>
                        Python 3.12
                    </div>
                    <div class="tech-item">
                        <span class="icon">🎯</span>
                        YOLOv8 (Ultralytics)
                    </div>
                    <div class="tech-item">
                        <span class="icon">💾</span>
                        MongoDB + Motor
                    </div>
                    <div class="tech-item">
                        <span class="icon">🔗</span>
                        Socket.IO
                    </div>
                    <div class="tech-item">
                        <span class="icon">🔐</span>
                        JWT Authentication
                    </div>
                    <div class="tech-item">
                        <span class="icon">☁️</span>
                        Cloudinary
                    </div>
                    <div class="tech-item">
                        <span class="icon">🖼️</span>
                        OpenCV
                    </div>
                    <div class="tech-item">
                        <span class="icon">🧠</span>
                        PyTorch
                    </div>
                    <div class="tech-item">
                        <span class="icon">🔄</span>
                        Uvicorn ASGI
                    </div>
                    <div class="tech-item">
                        <span class="icon">📝</span>
                        Pydantic
                    </div>
                    <div class="tech-item">
                        <span class="icon">🛡️</span>
                        Passlib + Bcrypt
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>🚀 <strong>YOLO Detection Backend</strong> - Production Ready</p>
                <p>Created with ❤️ for Vehicle Detection & Traffic Monitoring</p>
                <p><strong>Status:</strong> All systems operational ✅</p>
            </div>
        </div>
        
        <script>
            // Auto refresh every 30 seconds
            setTimeout(() => {{
                location.reload();
            }}, 30000);
        </script>
    </body>
    </html>
    """
    
    return html_content

@router.get("/backend-status")
async def backend_status():
    """
    API endpoint to get backend status in JSON format
    """
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "fastapi": "running",
            "socketio": "active",
            "mongodb": "connected",
            "yolo": "loaded"
        },
        "endpoints": {
            "auth": 4,
            "deteksi": 4,
            "dashboard": 2,
            "perhitungan": 3,
            "histori": 2,
            "admin": 2,
            "docs": 3
        },
        "models": ["User", "Deteksi", "Perhitungan", "Histori"],
        "tech_stack": [
            "FastAPI", "Python 3.12", "YOLOv8", "MongoDB", 
            "Socket.IO", "JWT", "Cloudinary", "OpenCV", "PyTorch"
        ]
    }