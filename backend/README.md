# Pure Python YOLO Detection Backend

Backend API untuk sistem deteksi kendaraan menggunakan YOLO, sepenuhnya berbasis Python dengan FastAPI.

## 🚀 Features

- **Pure Python**: Tidak ada dependency Node.js, semuanya Python
- **FastAPI**: Modern, fast web framework dengan auto-documentation
- **YOLO Detection**: Deteksi kendaraan dengan counting line yang akurat
- **Socket.IO**: Real-time progress updates
- **MongoDB**: Database NoSQL dengan Motor (async driver)
- **Cloudinary**: Cloud storage untuk video
- **PKJI 2023**: Perhitungan LOS sesuai standar Indonesia

## 📁 Project Structure

```
backend-python/
├── main.py                 # Entry point
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration
├── .env.example           # Environment template
├── app/
│   ├── config/            # Configuration
│   │   ├── database.py    # MongoDB connection
│   │   ├── cloudinary.py  # Cloudinary setup
│   │   └── constants.py   # PKJI constants
│   ├── models/            # Pydantic schemas
│   │   ├── user.py
│   │   ├── deteksi.py
│   │   ├── perhitungan.py
│   │   └── histori.py
│   ├── routes/            # API endpoints
│   │   ├── auth.py
│   │   ├── admin.py
│   │   ├── deteksi.py
│   │   ├── dashboard.py
│   │   ├── perhitungan.py
│   │   └── histori.py
│   ├── middleware/        # Middleware
│   │   ├── auth.py        # JWT authentication
│   │   └── upload.py      # File upload handling
│   ├── services/          # Business logic
│   │   └── yolo_detector.py  # YOLO processing
│   ├── core/              # Core components
│   │   └── socket.py      # Socket.IO manager
│   └── utils/             # Utilities
│       ├── jwt.py
│       ├── password.py
│       └── logger.py
└── models/                # YOLO model weights
    └── vehicle-night-yolo/
```

## 🛠️ Installation

### Prerequisites

- Python 3.11+
- MongoDB
- FFmpeg

### Local Development

```bash
# Clone repository
cd backend-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# atau
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run server
python main.py
```

### Docker

```bash
# Build image
docker build -t yolo-backend-python .

# Run container
docker run -p 3000:3000 --env-file .env yolo-backend-python
```

## 📚 API Documentation

Setelah server berjalan, akses dokumentasi API:

- **Swagger UI**: http://localhost:3000/docs
- **ReDoc**: http://localhost:3000/redoc

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Detection
- `POST /api/deteksi/upload` - Upload video untuk deteksi
- `GET /api/deteksi/list` - List detections
- `GET /api/deteksi/result/:id` - Get detection result
- `GET /api/deteksi/status/:id` - Get detection status
- `DELETE /api/deteksi/:id` - Delete detection

### Calculation (PKJI 2023)
- `POST /api/perhitungan/manual` - Manual calculation
- `POST /api/perhitungan/from-deteksi/:id` - Calculate from detection
- `GET /api/perhitungan/` - List calculations

### Dashboard
- `GET /api/dashboard/` - Get statistics

### Admin
- `GET /api/admin/stats` - Admin statistics
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user

## 🎯 YOLO Detection Features

- **100% Accurate Counting**: No miss, no double counting
- **Lane Detection**: Kiri (up) and Kanan (down) direction
- **Vehicle Classification**: Mobil, Bus, Truk with size validation
- **Real-time Progress**: Socket.IO updates during processing
- **Counting Line Visualization**: Clear visual indicators

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |

## 📦 Deployment (Render.com)

1. Push code ke GitHub
2. Buat Web Service baru di Render
3. Connect repository
4. Set environment variables
5. Deploy!

Build command: `pip install -r requirements.txt`
Start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

## 📝 Migration from Node.js

Backend ini adalah konversi lengkap dari Node.js ke Python:

| Node.js | Python |
|---------|--------|
| Express | FastAPI |
| Mongoose | Motor + Pydantic |
| Socket.IO | python-socketio |
| jsonwebtoken | python-jose |
| bcryptjs | passlib |
| multer | python-multipart |
| spawn Python | Direct Python |

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License
