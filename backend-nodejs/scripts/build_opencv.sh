#!/bin/bash

# OpenCV Build Script for Render.com
# This script ensures OpenCV is properly installed with all dependencies

set -e

echo "🚀 Starting OpenCV build process..."

# Update package list
echo "📦 Updating package list..."
apt-get update

# Install system dependencies
echo "🔧 Installing system dependencies..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    cmake \
    pkg-config \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-dev \
    libgtk-3-dev \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libopenexr-dev \
    libatlas-base-dev \
    python3-numpy \
    libtbb2 \
    libtbb-dev \
    libdc1394-22-dev \
    libopenblas-dev \
    liblapack-dev \
    libeigen3-dev

# Upgrade pip and install build tools
echo "🔨 Setting up Python environment..."
python3 -m pip install --upgrade pip setuptools wheel

# Set environment variables for OpenCV build
export OPENCV_LOG_LEVEL=ERROR
export NUMBA_DISABLE_JIT=1

# Try installing OpenCV with specific options
echo "📥 Installing OpenCV..."

# Method 1: Try pre-built wheel first
python3 -m pip install --no-cache-dir opencv-python-headless==4.8.0.76

# Verify installation
echo "✅ Verifying OpenCV installation..."
python3 -c "import cv2; print(f'OpenCV {cv2.__version__} installed successfully')"

# Install other requirements
echo "📚 Installing other Python dependencies..."
python3 -m pip install -r requirements.txt

echo "🎉 OpenCV build completed successfully!"