# =============================================================================
# Dockerfile untuk Node.js Backend + Python YOLO/OpenCV
# Hybrid setup: Node.js server that spawns Python for YOLO processing
# Optimized untuk Render.com deployment
# =============================================================================

# Use Node.js as base and add Python
FROM node:20-bookworm AS production

# Labels
LABEL maintainer="your-email@example.com" \
      version="2.1" \
      description="Node.js Backend with Python YOLO Detection"

# Install Python 3.11 and all dependencies in one layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Python 3.11
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    # Build tools for Python packages
    build-essential \
    gcc \
    g++ \
    # === OpenCV Core Dependencies ===
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    # === Video Processing (FFmpeg) ===
    ffmpeg \
    libavcodec-extra \
    libavformat-dev \
    libswscale-dev \
    # === Additional Image Libraries ===
    libjpeg62-turbo \
    libpng16-16 \
    libtiff6 \
    libwebp7 \
    # === Font Support (for OpenCV text rendering) ===
    fontconfig \
    fonts-liberation \
    # === Useful utilities ===
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create symlinks for python commands
RUN ln -sf /usr/bin/python3.11 /usr/bin/python && \
    ln -sf /usr/bin/python3.11 /usr/bin/python3

# Set working directory
WORKDIR /app

# Create virtual environment with Python 3.11
RUN python3.11 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set environment variables
ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/opt/venv/lib/python3.11/site-packages \
    VIRTUAL_ENV=/opt/venv \
    OPENCV_LOG_LEVEL=ERROR \
    QT_QPA_PLATFORM=offscreen \
    TORCH_HOME=/app/.torch \
    YOLO_VERBOSE=False \
    NUMBA_DISABLE_JIT=1 \
    MPLCONFIGDIR=/tmp/matplotlib

# Create necessary directories
RUN mkdir -p /app/temp /app/uploads /app/models /app/.torch /tmp/matplotlib

# Copy and install Python dependencies first (for caching)
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Verify all installations
RUN echo "=== Verifying Node.js ===" && \
    node --version && \
    echo "=== Verifying Python ===" && \
    python --version && \
    which python && \
    echo "=== Verifying venv Python ===" && \
    /opt/venv/bin/python --version && \
    echo "=== Verifying Python packages ===" && \
    /opt/venv/bin/python -c "import cv2; print(f'✅ OpenCV {cv2.__version__}')" && \
    /opt/venv/bin/python -c "import numpy as np; print(f'✅ NumPy {np.__version__}')" && \
    /opt/venv/bin/python -c "from ultralytics import YOLO; print('✅ YOLO ready')" && \
    /opt/venv/bin/python -c "import torch; print(f'✅ PyTorch {torch.__version__}')" && \
    echo "=== All verifications passed ==="

# Expose port (Render uses PORT env variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start Node.js server
CMD ["node", "server.js"]
