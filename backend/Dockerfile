# =============================================================================
# Dockerfile untuk FastAPI + YOLO + OpenCV
# Optimized untuk Render.com deployment
# =============================================================================

# Stage 1: Build stage untuk compile dependencies
FROM python:3.11-slim-bookworm AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# =============================================================================
# Stage 2: Production stage
# =============================================================================
FROM python:3.11-slim-bookworm AS production

# Labels
LABEL maintainer="your-email@example.com" \
      version="1.0" \
      description="FastAPI + YOLO Detection API with OpenCV"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    # OpenCV specific
    OPENCV_LOG_LEVEL=ERROR \
    # Disable GUI for headless operation
    QT_QPA_PLATFORM=offscreen \
    # Torch settings
    TORCH_HOME=/app/.torch \
    # YOLO settings
    YOLO_VERBOSE=False \
    # Disable JIT for stability
    NUMBA_DISABLE_JIT=1

# Install runtime system dependencies for OpenCV
# These are the CRITICAL packages that make OpenCV work
RUN apt-get update && apt-get install -y --no-install-recommends \
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

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Set working directory
WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create necessary directories with proper permissions
RUN mkdir -p /app/temp /app/uploads /app/models /app/.torch && \
    chown -R appuser:appgroup /app

# Copy application code
COPY --chown=appuser:appgroup . .

# Verify OpenCV installation
RUN python -c "import cv2; print(f'✅ OpenCV {cv2.__version__} installed successfully')" && \
    python -c "import numpy as np; print(f'✅ NumPy {np.__version__} installed successfully')" && \
    python -c "from ultralytics import YOLO; print('✅ YOLO installed successfully')" && \
    python -c "import torch; print(f'✅ PyTorch {torch.__version__} installed successfully')"

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command - Start with verification then server
CMD ["sh", "-c", "python startup.py && uvicorn src.app:app --host 0.0.0.0 --port 8000 --workers 1"]
