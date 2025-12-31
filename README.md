# Deteksi Ruas Jalan Toll - YOLO Vehicle Detection System

🚗 **Sistem deteksi kendaraan otomatis** menggunakan YOLO untuk analisis kinerja ruas jalan tol dengan role-based access control.

## 📁 Struktur Project

```
deteksi-ruasjalantoll/
├── frontend/              # React/Vite Frontend Application
│   ├── src/
│   │   ├── components/    # Reusable UI components  
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   └── config/        # API configuration
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
│
├── backend/               # Node.js/Express Backend API
│   ├── src/
│   │   ├── controllers/   # API route handlers
│   │   ├── models/        # MongoDB data models
│   │   ├── middlewares/   # Authentication & validation
│   │   ├── routes/        # API route definitions
│   │   └── utils/         # Helper utilities
│   ├── scripts/           # Database seed scripts
│   ├── temp/              # Temporary file storage
│   └── package.json       # Backend dependencies
│
└── README.md              # Project documentation
```

## 🎯 Fitur Utama

### 🔍 YOLO Detection Engine
- **100% Accuracy**: Enhanced detection algorithm untuk menghitung kendaraan
- **Vehicle Classification**: Pembedaan mobil, bus, dan truk berdasarkan ukuran
- **Anti-Double Counting**: Sistem ID tracking mencegah penghitungan ganda
- **Direction-Based Lanes**: KIRI (dekat→jauh), KANAN (jauh→dekat)
- **Visual Indicators**: Garis counting dengan titik, zona catch-up

### 👥 Role-Based Access Control  
- **User**: Dashboard view-only dengan data agregat
- **Surveyor**: Upload video, deteksi, perhitungan, histori (data sendiri)
- **Admin**: Full access ke semua fitur dan data semua user

### 📊 Interactive Dashboard
- **Date Picker**: Filter data harian dengan styling biru
- **Real-time Charts**: Grafik DJ (Derajat Jenuh) interaktif
- **Traffic Analysis**: Analisis volume dan kapasitas jalan
- **LOS Distribution**: Visualisasi Level of Service A-F

### 🎥 Video Processing
- **Cloudinary Integration**: Cloud storage untuk video input/output  
- **Progress Tracking**: Real-time progress selama proses deteksi
- **Multiple Formats**: Support berbagai format video

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure MongoDB, Cloudinary
npm start             # Server runs on http://localhost:3000
```

### Frontend Setup  
```bash
cd frontend
npm install
npm run dev          # Dev server runs on http://localhost:5174
```

### Create Users
```bash
cd backend
node scripts/createAdmin.js     # Create admin user
node scripts/createSurveyor.js  # Create surveyor user  
```

## 🛠 Tech Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- React Router DOM
- Context API for state management

**Backend:**
- Node.js + Express
- MongoDB + Mongoose  
- JWT Authentication
- Cloudinary for video storage
- Python YOLO integration

**Detection Engine:**
- YOLO v8 (Python)
- OpenCV untuk video processing
- Custom algorithms untuk vehicle classification
- ID tracking dengan bounding box analysis

## 📈 Detection Algorithm Features

- **Confidence Threshold**: 0.15 untuk menangkap semua kendaraan
- **Line Position**: 60% dari tinggi video untuk optimal detection
- **Catch-up Zone**: 100px zona deteksi tambahan
- **Size Validation**: Validasi berdasarkan area dan aspect ratio
- **Frame Processing**: Optimized untuk akurasi maksimal

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  

### Detection (Surveyor/Admin)
- `POST /api/deteksi/upload` - Upload video untuk deteksi
- `GET /api/deteksi/list` - List deteksi dengan pagination
- `GET /api/deteksi/result/:id` - Hasil deteksi detail

### Dashboard (All Roles)
- `GET /api/dashboard?date=YYYY-MM-DD` - Dashboard stats dengan filter tanggal

### Admin Only
- `GET /api/admin/users` - Manajemen user
- `POST /api/admin/users` - Create user baru

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**🚀 Ready untuk production dengan full role-based access control dan YOLO detection engine!**