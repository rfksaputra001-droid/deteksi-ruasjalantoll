#!/bin/bash

# Script untuk membersihkan port dan menstart server

echo "🧹 Membersihkan proses yang sedang berjalan..."

# Kill semua proses node yang menggunakan port 3000
echo "Mencari proses di port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Tidak ada proses di port 3000"

# Kill semua proses nodemon yang masih berjalan
echo "Menghentikan semua proses nodemon..."
pkill -f nodemon 2>/dev/null || echo "Tidak ada proses nodemon"

# Kill semua proses node server.js
echo "Menghentikan semua proses server.js..."
pkill -f "node.*server.js" 2>/dev/null || echo "Tidak ada proses server.js"

# Kill semua proses python yang mungkin masih berjalan dari YOLO
echo "Menghentikan proses YOLO/Python..."
pkill -f "python.*yolo" 2>/dev/null || echo "Tidak ada proses YOLO"

echo "✅ Pembersihan selesai!"

# Tunggu sebentar untuk memastikan port benar-benar kosong
sleep 2

echo "🚀 Memulai server..."
npm run dev