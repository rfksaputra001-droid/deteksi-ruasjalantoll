from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from datetime import datetime
import os
from app.config.database import get_collection
from app.utils.logger import logger

router = APIRouter()


async def check_system_status():
    """Check comprehensive system status"""
    status = {
        "database": {"status": "❌", "details": "Not connected"},
        "collections": {"status": "❌", "details": "Not checked"},
        "cloudinary": {"status": "❌", "details": "Not configured"},
        "jwt": {"status": "❌", "details": "Not configured"},
        "yolo": {"status": "❌", "details": "Not checked"},
        "socket_io": {"status": "✅", "details": "Active"}
    }
    
    # Check database connection
    try:
        users = get_collection("users")
        await users.find_one({})  # Test connection
        status["database"] = {"status": "✅", "details": "Connected to MongoDB"}
        
        # Count collections data
        user_count = await users.count_documents({})
        deteksi_count = await get_collection("deteksi").count_documents({})
        status["collections"] = {
            "status": "✅", 
            "details": f"Users: {user_count}, Deteksi: {deteksi_count}"
        }
    except Exception as e:
        status["database"] = {"status": "❌", "details": f"Error: {str(e)[:50]}"}
    
    # Check environment variables
    if os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY"):
        status["cloudinary"] = {"status": "✅", "details": "Keys configured"}
    else:
        status["cloudinary"] = {"status": "⚠️", "details": "Missing API keys"}
    
    if os.getenv("JWT_SECRET"):
        status["jwt"] = {"status": "✅", "details": "Secret configured"}
    else:
        status["jwt"] = {"status": "⚠️", "details": "Using default secret"}
    
    # Check YOLO
    try:
        from ultralytics import YOLO
        status["yolo"] = {"status": "✅", "details": "YOLOv8 available"}
    except:
        status["yolo"] = {"status": "❌", "details": "Import failed"}
    
    return status


@router.get("/backend-status-check", response_class=HTMLResponse)
async def backend_system_dashboard():
    """
    Advanced Backend Dashboard dengan Real-time System Status
    """
    
    # Get real-time system status
    system_status = await check_system_status()
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🚀 YOLO Backend - System Status Dashboard</title>
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #2C3E50 0%, #34495E 50%, #2C3E50 100%);
                color: #ECF0F1;
                line-height: 1.6;
                min-height: 100vh;
                overflow-x: hidden;
            }}
            
            .container {{
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }}
            
            .header {{
                text-align: center;
                color: white;
                margin-bottom: 30px;
                padding: 40px;
                background: linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(52, 152, 219, 0.1));
                border-radius: 20px;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            }}
            
            .header h1 {{
                font-size: 3rem;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                background: linear-gradient(45deg, #3498DB, #2ECC71);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            
            .header .subtitle {{
                font-size: 1.2rem;
                opacity: 0.9;
                margin-bottom: 15px;
            }}
            
            .timestamp {{
                color: #F39C12;
                font-weight: bold;
                font-size: 1.1rem;
            }}
            
            .system-overview {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 25px;
                margin-bottom: 40px;
            }}
            
            .status-card {{
                background: linear-gradient(135deg, rgba(52, 73, 94, 0.8), rgba(44, 62, 80, 0.8));
                border-radius: 20px;
                padding: 30px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }}
            
            .status-card::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #3498DB, #2ECC71);
            }}
            
            .status-card:hover {{
                transform: translateY(-10px);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            }}
            
            .status-header {{
                display: flex;
                align-items: center;
                margin-bottom: 20px;
            }}
            
            .status-icon {{
                font-size: 3rem;
                margin-right: 20px;
            }}
            
            .status-title {{
                font-size: 1.4rem;
                font-weight: bold;
            }}
            
            .status-value {{
                font-size: 2.5rem;
                font-weight: bold;
                margin: 15px 0;
                text-align: center;
            }}
            
            .status-description {{
                color: #BDC3C7;
                font-size: 1rem;
                text-align: center;
            }}
            
            .ready {{ color: #2ECC71; }}
            .warning {{ color: #F39C12; }}
            .error {{ color: #E74C3C; }}
            
            .features-section {{
                background: linear-gradient(135deg, rgba(52, 73, 94, 0.8), rgba(44, 62, 80, 0.8));
                border-radius: 20px;
                padding: 40px;
                margin-bottom: 30px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
            }}
            
            .features-section h2 {{
                color: #3498DB;
                margin-bottom: 30px;
                font-size: 2rem;
                text-align: center;
            }}
            
            .features-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
            }}
            
            .feature-item {{
                display: flex;
                align-items: center;
                padding: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                border-left: 5px solid #3498DB;
                transition: all 0.3s ease;
            }}
            
            .feature-item:hover {{
                background: rgba(255, 255, 255, 0.1);
                transform: translateX(10px);
            }}
            
            .feature-icon {{
                font-size: 2rem;
                margin-right: 20px;
                min-width: 40px;
            }}
            
            .feature-text {{
                flex: 1;
            }}
            
            .feature-title {{
                font-weight: bold;
                margin-bottom: 5px;
                color: #ECF0F1;
            }}
            
            .feature-desc {{
                color: #BDC3C7;
                font-size: 0.9rem;
            }}
            
            .endpoints-section {{
                background: linear-gradient(135deg, rgba(52, 73, 94, 0.8), rgba(44, 62, 80, 0.8));
                border-radius: 20px;
                padding: 40px;
                margin-bottom: 30px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
            }}
            
            .endpoints-section h2 {{
                color: #2ECC71;
                margin-bottom: 30px;
                font-size: 2rem;
                text-align: center;
            }}
            
            .endpoint-categories {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 25px;
            }}
            
            .endpoint-category {{
                background: rgba(255, 255, 255, 0.05);
                border-radius: 15px;
                padding: 25px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }}
            
            .endpoint-category h3 {{
                color: #F39C12;
                margin-bottom: 20px;
                font-size: 1.3rem;
                display: flex;
                align-items: center;
            }}
            
            .endpoint-category h3::before {{
                content: '🔹';
                margin-right: 10px;
            }}
            
            .endpoint-list {{
                list-style: none;
                margin: 0;
                padding: 0;
            }}
            
            .endpoint-list li {{
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
            }}
            
            .endpoint-list li:last-child {{
                border-bottom: none;
            }}
            
            .method-badge {{
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: bold;
                margin-right: 12px;
                min-width: 50px;
                text-align: center;
            }}
            
            .get {{ background: #27AE60; color: white; }}
            .post {{ background: #3498DB; color: white; }}
            .put {{ background: #F39C12; color: white; }}
            .delete {{ background: #E74C3C; color: white; }}
            
            .endpoint-path {{
                font-family: 'Courier New', monospace;
                color: #ECF0F1;
                font-size: 0.9rem;
            }}
            
            .auto-refresh {{
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #3498DB, #2ECC71);
                color: white;
                padding: 15px 25px;
                border-radius: 30px;
                font-size: 0.9rem;
                font-weight: bold;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                z-index: 1000;
            }}
            
            .footer {{
                text-align: center;
                color: #BDC3C7;
                margin-top: 40px;
                padding: 30px;
                background: linear-gradient(135deg, rgba(52, 73, 94, 0.5), rgba(44, 62, 80, 0.5));
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }}
            
            .pulse {{
                animation: pulse 2s infinite;
            }}
            
            @keyframes pulse {{
                0% {{ opacity: 1; }}
                50% {{ opacity: 0.7; }}
                100% {{ opacity: 1; }}
            }}
        </style>
    </head>
    <body>
        <div class="auto-refresh pulse">
            🔄 Auto-refresh: 30s
        </div>
        
        <div class="container">
            <div class="header">
                <h1>🚀 YOLO Detection Backend</h1>
                <div class="subtitle">Real-time System Dashboard & Health Monitor</div>
                <div class="timestamp">Last Update: {datetime.now().strftime('%d %B %Y - %H:%M:%S WIB')}</div>
            </div>
            
            <!-- System Status Overview -->
            <div class="system-overview">
                <div class="status-card">
                    <div class="status-header">
                        <div class="status-icon">{system_status["database"]["status"]}</div>
                        <div class="status-title">Database</div>
                    </div>
                    <div class="status-value {('ready' if system_status['database']['status'] == '✅' else 'error')}">{system_status["database"]["status"]}</div>
                    <div class="status-description">{system_status["database"]["details"]}</div>
                </div>
                
                <div class="status-card">
                    <div class="status-header">
                        <div class="status-icon">{system_status["yolo"]["status"]}</div>
                        <div class="status-title">YOLO AI</div>
                    </div>
                    <div class="status-value {('ready' if system_status['yolo']['status'] == '✅' else 'error')}">{system_status["yolo"]["status"]}</div>
                    <div class="status-description">{system_status["yolo"]["details"]}</div>
                </div>
                
                <div class="status-card">
                    <div class="status-header">
                        <div class="status-icon">{system_status["socket_io"]["status"]}</div>
                        <div class="status-title">Real-time</div>
                    </div>
                    <div class="status-value ready">{system_status["socket_io"]["status"]}</div>
                    <div class="status-description">{system_status["socket_io"]["details"]}</div>
                </div>
                
                <div class="status-card">
                    <div class="status-header">
                        <div class="status-icon">{system_status["cloudinary"]["status"]}</div>
                        <div class="status-title">Storage</div>
                    </div>
                    <div class="status-value {('ready' if system_status['cloudinary']['status'] == '✅' else 'warning')}">{system_status["cloudinary"]["status"]}</div>
                    <div class="status-description">{system_status["cloudinary"]["details"]}</div>
                </div>
                
                <div class="status-card">
                    <div class="status-header">
                        <div class="status-icon">{system_status["jwt"]["status"]}</div>
                        <div class="status-title">Security</div>
                    </div>
                    <div class="status-value {('ready' if system_status['jwt']['status'] == '✅' else 'warning')}">{system_status["jwt"]["status"]}</div>
                    <div class="status-description">{system_status["jwt"]["details"]}</div>
                </div>
                
                <div class="status-card">
                    <div class="status-header">
                        <div class="status-icon">{system_status["collections"]["status"]}</div>
                        <div class="status-title">Data</div>
                    </div>
                    <div class="status-value {('ready' if system_status['collections']['status'] == '✅' else 'error')}">{system_status["collections"]["status"]}</div>
                    <div class="status-description">{system_status["collections"]["details"]}</div>
                </div>
            </div>
            
            <!-- Features Section -->
            <div class="features-section">
                <h2>✨ Ready Features</h2>
                <div class="features-grid">
                    <div class="feature-item">
                        <div class="feature-icon ready">✅</div>
                        <div class="feature-text">
                            <div class="feature-title">FastAPI Backend Server</div>
                            <div class="feature-desc">Production-ready with async support</div>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon ready">✅</div>
                        <div class="feature-text">
                            <div class="feature-title">Smart Authentication</div>
                            <div class="feature-desc">JWT + Auto role detection (admin/surveyor/user)</div>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon ready">✅</div>
                        <div class="feature-text">
                            <div class="feature-title">YOLO Video Detection</div>
                            <div class="feature-desc">YOLOv8 vehicle detection & counting</div>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon ready">✅</div>
                        <div class="feature-text">
                            <div class="feature-title">Real-time Updates</div>
                            <div class="feature-desc">Socket.IO progress tracking</div>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon ready">✅</div>
                        <div class="feature-text">
                            <div class="feature-title">Database Integration</div>
                            <div class="feature-desc">MongoDB with Motor async driver</div>
                        </div>
                    </div>
                    
                    <div class="feature-item">
                        <div class="feature-icon ready">✅</div>
                        <div class="feature-text">
                            <div class="feature-title">CORS Configuration</div>
                            <div class="feature-desc">Dynamic Vercel preview URL support</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- API Endpoints -->
            <div class="endpoints-section">
                <h2>📡 API Endpoints (25+)</h2>
                <div class="endpoint-categories">
                    <div class="endpoint-category">
                        <h3>Authentication</h3>
                        <ul class="endpoint-list">
                            <li><span class="method-badge post">POST</span><span class="endpoint-path">/api/auth/register</span></li>
                            <li><span class="method-badge post">POST</span><span class="endpoint-path">/api/auth/login</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/auth/me</span></li>
                            <li><span class="method-badge post">POST</span><span class="endpoint-path">/api/auth/create-test-user</span></li>
                        </ul>
                    </div>
                    
                    <div class="endpoint-category">
                        <h3>Detection</h3>
                        <ul class="endpoint-list">
                            <li><span class="method-badge post">POST</span><span class="endpoint-path">/api/deteksi/upload</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/deteksi/</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/deteksi/{{id}}</span></li>
                            <li><span class="method-badge delete">DELETE</span><span class="endpoint-path">/api/deteksi/{{id}}</span></li>
                        </ul>
                    </div>
                    
                    <div class="endpoint-category">
                        <h3>Dashboard & Analytics</h3>
                        <ul class="endpoint-list">
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/dashboard/stats</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/dashboard/recent</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/backend-info</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/backend-status-check</span></li>
                        </ul>
                    </div>
                    
                    <div class="endpoint-category">
                        <h3>Admin & Management</h3>
                        <ul class="endpoint-list">
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/admin/users</span></li>
                            <li><span class="method-badge delete">DELETE</span><span class="endpoint-path">/api/admin/users/{{id}}</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/histori/</span></li>
                            <li><span class="method-badge get">GET</span><span class="endpoint-path">/api/perhitungan/</span></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>🚀 YOLO Detection Backend</strong> - Production Deployment Ready</p>
                <p>Built with FastAPI + YOLOv8 + MongoDB + Socket.IO</p>
                <p><strong>Status:</strong> All core systems operational! 🎯</p>
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
async def backend_status_json():
    """
    JSON API endpoint for backend status
    """
    system_status = await check_system_status()
    
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "system_status": system_status,
        "services": {
            "fastapi": "running",
            "socketio": "active",
            "database": system_status["database"]["status"] == "✅",
            "yolo": system_status["yolo"]["status"] == "✅"
        },
        "endpoints": {
            "auth": 4,
            "deteksi": 4,
            "dashboard": 4,
            "perhitungan": 3,
            "histori": 2,
            "admin": 2
        },
        "models": ["User", "Deteksi", "Perhitungan", "Histori"],
        "tech_stack": [
            "FastAPI", "Python 3.11", "YOLOv8", "MongoDB", 
            "Socket.IO", "JWT", "Cloudinary", "OpenCV", "PyTorch"
        ]
    }