# 🚗 Sistem Monitoring Lalu Lintas dengan YOLO AI

Sistem monitoring lalu lintas lengkap yang mengintegrasikan deteksi kendaraan berbasis YOLO AI dengan analisis kinerja ruas jalan sesuai standar PKJI 2023.

## 📋 Daftar Isi
- [Overview Sistem](#overview-sistem)
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Proyek](#struktur-proyek)
- [Instalasi](#instalasi)
- [Penggunaan](#penggunaan)
- [API Documentation](#api-documentation)
- [Model YOLO](#model-yolo)
- [Database](#database)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Kontribusi](#kontribusi)

## 🔍 Overview Sistem

Sistem ini terdiri dari tiga komponen utama:

1. **Frontend React** - Interface web responsif untuk monitoring dan analisis
2. **Backend Node.js** - API server dengan Socket.IO untuk real-time updates  
3. **YOLO AI Engine** - Model deep learning untuk deteksi kendaraan

### Arsitektur Sistem
```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   React App     │◄──►│   Node.js API    │◄──►│   YOLO AI Engine   │
│  (Frontend)     │    │   (Backend)      │    │   (Python/PyTorch) │
└─────────────────┘    └──────────────────┘    └────────────────────┘
         │                       │                          │
         ▼                       ▼                          ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   Browser       │    │   MongoDB        │    │   Cloudinary       │
│   Interface     │    │   Database       │    │   Cloud Storage    │
└─────────────────┘    └──────────────────┘    └────────────────────┘
                                                         │
                                                         ▼
                                              ┌────────────────────┐
                                              │ • Input Videos     │
                                              │ • Output Videos    │
                                              │ • Detection Results│
                                              │ • JSON Data        │
                                              └────────────────────┘
```

## ✨ Fitur Utama

### 🎯 Deteksi YOLO AI
- **Cloud-First Processing**: Upload langsung ke Cloudinary, processing tanpa local storage
- **Real-time Video Processing**: Upload dan analisis video lalu lintas
- **Vehicle Classification**: Deteksi mobil, bus, dan truk
- **Lane Counting**: Penghitungan kendaraan per lajur (kiri/kanan)
- **Line Crossing Detection**: Sistem penghitung otomatis dengan garis virtual
- **Progress Tracking**: Real-time progress via Socket.IO
- **Cloud Results Storage**: Semua hasil (video, JSON) tersimpan di Cloudinary

### 📊 Analisis Lalu Lintas
- **PKJI 2023 Compliance**: Perhitungan kapasitas sesuai standar Indonesia
- **Level of Service (LOS)**: Klasifikasi A-F berdasarkan degree of saturation
- **Traffic Volume Analysis**: Analisis volume 24 jam
- **Historical Data**: Penyimpanan dan analisis data historis

### 🎮 User Interface
- **Responsive Design**: Tailwind CSS untuk UI yang responsif
- **Real-time Dashboard**: Statistik dan grafik live
- **Interactive Charts**: Visualisasi data dengan Recharts
- **Export Functionality**: Export ke PDF/CSV
- **Progressive Web App**: PWA-ready

### 👤 Manajemen User
- **Authentication System**: Login/logout dengan JWT
- **Admin Panel**: Manajemen user dan sistem
- **Role-based Access**: User dan admin permissions
- **Session Management**: Secure session handling

## 🛠️ Teknologi yang Digunakan

### Frontend
- **React 18.2.0** - Library UI modern
- **React Router DOM 6.20.0** - Client-side routing
- **Tailwind CSS 3.3.0** - Utility-first CSS framework
- **Recharts 2.10.0** - Library untuk visualisasi data
- **Socket.IO Client 4.8.3** - Real-time communication
- **Vite 5.0.0** - Build tool cepat

### Backend
- **Node.js** - Runtime JavaScript server-side
- **Express.js 4.18.2** - Web framework
- **MongoDB & Mongoose** - Database NoSQL
- **Socket.IO** - Real-time bidirectional communication
- **Cloudinary** - Cloud storage untuk video
- **FFmpeg** - Video processing dan conversion
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing

### AI & Machine Learning
- **YOLOv8** - State-of-the-art object detection
- **PyTorch** - Deep learning framework
- **OpenCV** - Computer vision library
- **Ultralytics** - YOLO implementation
- **CUDA Support** - GPU acceleration (optional)

## 📁 Struktur Proyek

```
figma-mcp/
├── package.json                    # Root package untuk menjalankan full-stack
├── test_auth.sh                   # Script testing authentication
├── kinerja-ruas-jalan/           # Frontend React Application
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.cjs
│   ├── src/
│   │   ├── App.jsx               # Main App component
│   │   ├── index.jsx             # Entry point
│   │   ├── components/           # Reusable components
│   │   │   ├── Layout/          # Layout components
│   │   │   ├── Dashboard/       # Dashboard widgets
│   │   │   └── UI/              # UI components
│   │   ├── pages/               # Page components
│   │   │   ├── Login.jsx        # Authentication
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── Deteksi.jsx      # YOLO detection
│   │   │   ├── Perhitungan.jsx  # PKJI calculations
│   │   │   ├── Histori.jsx      # History list
│   │   │   └── ...
│   │   ├── context/             # React Context
│   │   └── config/              # Configuration
│   └── public/                  # Static assets
└── yolo-backend final/           # Backend Node.js API
    ├── package.json
    ├── server.js                 # Main server file
    ├── src/
    │   ├── app.js               # Express app setup
    │   ├── config/              # Database & configurations
    │   ├── controllers/         # Route controllers
    │   ├── models/              # MongoDB models
    │   ├── routes/              # API routes
    │   ├── middlewares/         # Custom middlewares
    │   ├── utils/               # Utility functions
    │   └── workers/             # Background workers
    ├── scripts/                 # Database scripts
    ├── uploads/                 # Local file storage
    └── frontend/                # Frontend copy (backup)
```

## 🚀 Instalasi

### Prasyarat
- **Node.js** (v16 atau lebih baru)
- **MongoDB** (local atau cloud)
- **Python 3.8+** dengan pip
- **FFmpeg** (untuk video processing)
- **Git**

### Langkah Instalasi

1. **Clone Repository**
```bash
git clone <repository-url>
cd figma-mcp
```

2. **Install Dependencies**
```bash
# Install semua dependencies (backend + frontend)
npm run install:all

# Atau install manual:
# Backend
cd "yolo-backend final"
npm install

# Frontend  
cd ../kinerja-ruas-jalan
npm install
```

3. **Install Python Dependencies**
```bash
# Di dalam folder yolo-backend final
pip install torch torchvision ultralytics opencv-python numpy
```

4. **Environment Variables**

Buat file `.env` di folder `yolo-backend final/`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/yolo-detection

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

5. **Setup MongoDB**
```bash
# Jalankan MongoDB local atau gunakan MongoDB Atlas
# Database akan dibuat otomatis saat server pertama kali run
```

6. **Create Admin User**
```bash
cd "yolo-backend final"
npm run create-admin
# Follow the prompts
```

## 🎮 Penggunaan

### Development Mode

1. **Jalankan Full Stack**
```bash
# Dari root folder
npm run dev
```
Ini akan menjalankan:
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

2. **Atau Jalankan Terpisah**

Backend:
```bash
cd "yolo-backend final"
npm run dev
```

Frontend:
```bash
cd kinerja-ruas-jalan
npm run dev
```

### Production Mode

1. **Build Frontend**
```bash
npm run build:frontend
```

2. **Start Backend**
```bash
npm run start:backend
```

### Cara Menggunakan Sistem

1. **Login**
   - Buka http://localhost:5173
   - Masukkan credentials admin yang sudah dibuat

2. **Upload Video**
   - Pergi ke halaman "Deteksi"
   - Upload video lalu lintas (MP4, AVI, MOV)
   - Video langsung diupload ke Cloudinary cloud storage
   - Tunggu proses YOLO detection selesai (cloud processing)
   - Semua hasil tersimpan di cloud, tidak ada file local

3. **Lihat Hasil**
   - Hasil deteksi akan tampil real-time
   - Video hasil dengan bounding box tersedia
   - Data counting per lajur terekam

4. **Analisis PKJI**
   - Pergi ke halaman "Perhitungan"
   - Input parameter jalan
   - Sistem akan hitung kapasitas dan LOS

5. **Review History**
   - Halaman "Histori" untuk melihat semua analisis
   - Export data ke CSV/PDF

## 📡 API Documentation

### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

### Detection Endpoints
```
POST /api/deteksi/upload          # Upload video untuk deteksi
GET  /api/deteksi/list            # List semua deteksi
GET  /api/deteksi/:id             # Detail deteksi
DELETE /api/deteksi/:id           # Hapus deteksi
```

### Admin Endpoints
```
GET    /api/admin/users           # List users
POST   /api/admin/users           # Create user
PUT    /api/admin/users/:id       # Update user
DELETE /api/admin/users/:id       # Delete user
GET    /api/admin/stats           # System statistics
```

### Real-time Events (Socket.IO)
```javascript
// Join detection room
socket.emit('join-detection', detectionId)

// Progress updates
socket.on('progress', (data) => {
  // { stage, progress, message }
})

// Detection complete
socket.on('detection-complete', (result) => {
  // Final results
})
```

## 🤖 Model YOLO

### Model yang Digunakan
- **YOLOv8** - Custom trained model
- **Classes**: mobil, bus, truk
- **Input Size**: 640x640
- **Framework**: Ultralytics

### Training Data
Model dilatih khusus untuk:
- Kondisi lalu lintas Indonesia
- Berbagai jenis kendaraan
- Kondisi pencahayaan siang/malam

### Performance
- **Accuracy**: ~85%+ untuk deteksi kendaraan
- **Speed**: Real-time processing (30+ FPS dengan GPU)
- **Memory**: Optimized untuk production

## 🗄️ Database

### MongoDB Collections

#### DeteksiYOLO
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  videoFileName: String,
  status: "processing|completed|failed",
  totalVehicles: Number,
  countingData: {
    totalCounted: Number,
    laneKiri: { total: 0, mobil: 0, bus: 0, truk: 0 },
    laneKanan: { total: 0, mobil: 0, bus: 0, truk: 0 },
    linePosition: Number
  },
  // Input video Cloudinary storage
  inputCloudinaryUrl: String,
  inputCloudinaryId: String,
  // Output video Cloudinary storage  
  cloudinaryVideoUrl: String,
  cloudinaryVideoId: String,
  // Results JSON Cloudinary storage
  resultsCloudinaryUrl: String,
  resultsCloudinaryId: String,
  storageType: "cloudinary",
  processingTime: Number,
  createdAt: Date
}
```

#### Users
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  role: "user|admin",
  createdAt: Date
}
```

#### Perhitungan
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  namaRuas: String,
  parameters: Object,
  results: Object,
  createdAt: Date
}
```

## 🚀 Deployment

### Local Deployment
```bash
# Build frontend
npm run build:frontend

# Start production server
npm run start:backend
```

### Docker Deployment
```dockerfile
# Backend Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Deployment (Heroku/Railway/DigitalOcean)
1. Setup environment variables
2. Configure MongoDB Atlas
3. Setup Cloudinary untuk storage
4. Deploy dengan git push atau Docker

## 📸 Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)
*Real-time traffic monitoring dengan statistik dan grafik*

### Deteksi YOLO
![Detection](screenshots/detection.png)
*Video upload dan hasil deteksi dengan counting*

### Perhitungan PKJI
![Calculation](screenshots/calculation.png)
*Analisis kapasitas jalan sesuai standar PKJI 2023*

### Admin Panel
![Admin](screenshots/admin.png)
*Manajemen user dan monitoring sistem*

## 🤝 Kontribusi

### Development Guidelines
1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Bug Reports
Gunakan GitHub Issues untuk melaporkan bug dengan:
- Deskripsi detail bug
- Steps untuk reproduce
- Expected vs actual behavior
- Screenshots jika perlu

### Feature Requests
1. Cek existing issues dulu
2. Buat issue baru dengan label "enhancement"
3. Jelaskan use case dan manfaat fitur

## 📄 Lisensi

Proyek ini menggunakan lisensi MIT. Lihat file `LICENSE` untuk detail.

## 👨‍💻 Author

**Rifki** - *Full Stack Developer*
- GitHub: [@rifki](https://github.com/rifki)
- Email: rifki@example.com

## 🙏 Acknowledgments

- **Ultralytics** - YOLO implementation
- **OpenCV** - Computer vision library  
- **MongoDB** - Database solution
- **React Team** - Frontend framework
- **Tailwind CSS** - Styling framework
- **Indonesian Ministry of Transportation** - PKJI 2023 standards

## 📚 Resources

### Dokumentasi Teknis
- [React Documentation](https://reactjs.org/)
- [Node.js Documentation](https://nodejs.org/)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

### Standards & References
- [PKJI 2023](https://pusjatan.pu.go.id/) - Indonesian Road Capacity Manual
- [LOS Classification](https://en.wikipedia.org/wiki/Level_of_service) - Traffic Engineering

---

## 🔧 Quick Commands

```bash
# Development
npm run dev                 # Start full-stack development
npm run backend            # Start backend only
npm run frontend           # Start frontend only

# Installation
npm run install:all        # Install all dependencies
npm run install:backend    # Install backend deps
npm run install:frontend   # Install frontend deps

# Production
npm run build:frontend     # Build frontend for production
npm run start:backend      # Start backend in production

# Admin
npm run create-admin       # Create admin user
```

**Happy Coding! 🚀**