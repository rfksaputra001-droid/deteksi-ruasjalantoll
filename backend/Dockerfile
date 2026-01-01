# =============================================================================
# Dockerfile untuk Node.js Backend + Python YOLO/OpenCV
# Hybrid setup: Node.js server that spawns Python for YOLO processing
# Optimized untuk Render.com deployment
# =============================================================================

# Stage 1: Python builder - compile Python dependencies
FROM python:3.11-slim-bookworm AS python-builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install Python dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# =============================================================================
# Stage 2: Production stage - Node.js + Python runtime
# =============================================================================
FROM node:20-bookworm-slim AS production

# Labels
LABEL maintainer="your-email@example.com" \
      version="2.0" \
      description="Node.js Backend with Python YOLO Detection"

# Install Python 3.11 and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Python runtime
    python3 \
    python3-venv \
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

# Create symlink for python command to point to python3
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy Python virtual environment from builder stage
COPY --from=python-builder /opt/venv /opt/venv

# Set environment variables
ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/opt/venv/lib/python3.11/site-packages \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    OPENCV_LOG_LEVEL=ERROR \
    QT_QPA_PLATFORM=offscreen \
    TORCH_HOME=/app/.torch \
    YOLO_VERBOSE=False \
    NUMBA_DISABLE_JIT=1 \
    MPLCONFIGDIR=/tmp/matplotlib

# Create necessary directories
RUN mkdir -p /app/temp /app/uploads /app/models /app/.torch /tmp/matplotlib

# Copy package files first for caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Verify installations
RUN echo "=== Verifying Node.js ===" && \
    node --version && \
    echo "=== Verifying Python ===" && \
    python --version && \
    which python && \
    echo "=== Verifying Python packages ===" && \
    python -c "import cv2; print(f'✅ OpenCV {cv2.__version__}')" && \
    python -c "import numpy as np; print(f'✅ NumPy {np.__version__}')" && \
    python -c "from ultralytics import YOLO; print('✅ YOLO ready')" && \
    python -c "import torch; print(f'✅ PyTorch {torch.__version__}')" && \
    echo "=== All verifications passed ==="

# Expose port (Render uses PORT env variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start Node.js server (Render provides PORT env variable)
CMD ["node", "server.js"]
