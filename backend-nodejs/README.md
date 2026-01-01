# 🎯 YOLO Detection Backend API

Backend API untuk sistem deteksi YOLO dengan manajemen admin lengkap.

## 🚀 Features

- ✅ **Authentication & Authorization** (JWT)
- ✅ **Admin Panel** (User Management)
- ✅ **Video Upload & Processing**
- ✅ **YOLO Detection Integration**
- ✅ **Cloudinary Storage**
- ✅ **MongoDB Database**
- ✅ **Auto Cleanup Expired Videos**
- ✅ **Activity History Logging**
- ✅ **Role-Based Access Control**

## 📦 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Atlas)
- **Storage:** Cloudinary
- **Authentication:** JWT
- **Video Processing:** FFmpeg

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd yolo-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret_min_32_chars
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Create Admin User

```bash
npm run create-admin
```

Default admin credentials:
- Email: `admin@yolo.com`
- Password: `Admin123!`

⚠️ **Change password after first login!**

### 5. Run Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Admin (Admin Only)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get single user
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `PATCH /api/admin/users/:id/toggle-status` - Toggle user status
- `PUT /api/admin/users/:id/reset-password` - Reset password

### Videos (Protected)
- Coming soon...

### Detection (Protected)
- Coming soon...

## 🔐 Authentication

All protected routes require Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

## 👥 User Roles

- **Admin**: Full access to all features + user management
- **User**: Access to own videos and detections

## 📝 Example Requests

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "namaUser": "John Doe",
  "emailUser": "john@example.com",
  "passwordUser": "password123"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "emailUser": "admin@yolo.com",
  "passwordUser": "Admin123!"
}
```

### Get All Users (Admin)
```bash
GET /api/admin/users?page=1&limit=10
Authorization: Bearer <admin_token>
```

## 🧹 Automated Cleanup

The system automatically deletes expired videos daily at 2 AM:
- Videos older than 7 days (configurable)
- Removes from Cloudinary
- Soft deletes from database

## 📊 Database Models

- **User** - User accounts
- **Video** - Video metadata
- **DeteksiYOLO** - Detection results
- **Perhitungan** - Calculations (DJ, LOS)
- **Histori** - Activity logs
- **Dataset** - Dataset management

## 🚀 Deployment

### Render.com (Recommended)

1. Connect GitHub repository
2. Set environment variables
3. Deploy!

Auto-deploys on git push.

## 📄 License

MIT

## 👨‍💻 Author

Your Name

## 🤝 Contributing

Pull requests are welcome!
