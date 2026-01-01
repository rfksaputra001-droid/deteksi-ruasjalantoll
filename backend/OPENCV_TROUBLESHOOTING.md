# OpenCV Troubleshooting Guide for Render.com

## Common Issues and Solutions

### 1. ModuleNotFoundError: No module named 'cv2'

**Cause**: Missing system dependencies or incorrect OpenCV build.

**Solutions**:
```bash
# Verify system dependencies
./scripts/build_opencv.sh

# Test installation
python3 scripts/verify_opencv.py
```

### 2. ImportError: libGL.so.1: cannot open shared object file

**Cause**: Missing OpenGL libraries (common in headless environments).

**Solution**: Use opencv-python-headless instead of opencv-python:
```txt
opencv-python-headless==4.8.0.76
```

### 3. Build timeout on Render

**Cause**: OpenCV compilation takes too long.

**Solutions**:
- Use pre-built wheel: `opencv-python-headless`
- Increase build timeout in render.yaml
- Use smaller OpenCV version

### 4. Memory issues during build

**Cause**: Insufficient memory for compilation.

**Solutions**:
- Use pre-compiled wheels
- Upgrade to larger Render plan
- Set environment variables:
  ```
  NUMBA_DISABLE_JIT=1
  OPENCV_LOG_LEVEL=ERROR
  ```

### 5. Version conflicts

**Cause**: Incompatible versions between OpenCV, NumPy, and other packages.

**Solution**: Use tested version combinations:
```txt
opencv-python-headless==4.8.0.76
numpy==1.24.4
scipy==1.11.4
```

## Verification Steps

1. **Check system dependencies**:
   ```bash
   apt list --installed | grep -E "(libopencv|python3-dev|build-essential)"
   ```

2. **Test Python imports**:
   ```python
   import cv2
   import numpy as np
   print(f"OpenCV: {cv2.__version__}")
   print(f"NumPy: {np.__version__}")
   ```

3. **Test basic functionality**:
   ```python
   import cv2
   import numpy as np
   
   # Create test image
   img = np.zeros((100, 100, 3), dtype=np.uint8)
   gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
   print("OpenCV functionality working!")
   ```

## Environment Variables

Set these in render.yaml:
```yaml
envVars:
  - key: OPENCV_LOG_LEVEL
    value: "ERROR"
  - key: NUMBA_DISABLE_JIT
    value: "1"
  - key: PYTHONPATH
    value: "/opt/render/project/src/backend"
```

## Alternative Solutions

### Option 1: Docker-based deployment
Use a custom Docker image with OpenCV pre-installed.

### Option 2: Lighter alternatives
Consider using:
- `opencv-python-headless` (no GUI components)
- `imageio` for basic image operations
- `Pillow` for simple image processing

### Option 3: Cloud-native image processing
Use services like:
- Cloudinary for image transformations
- AWS Lambda with pre-built layers
- Google Cloud Functions with custom runtime

## Render-Specific Configuration

### Build Command
```yaml
buildCommand: |
  # Install system deps
  apt-get update && apt-get install -y python3-dev libgl1-mesa-glx
  # Install Python deps
  cd backend && pip3 install -r requirements.txt
  # Verify OpenCV
  python3 scripts/verify_opencv.py
  # Build frontend
  cd ../frontend && npm install && npm run build
```

### Start Command
```yaml
startCommand: |
  cd backend && python3 scripts/verify_opencv.py && npm start
```

## Testing Locally

Before deploying, test locally:
```bash
# Create similar environment
docker run -it --rm python:3.11-slim bash

# Install system deps
apt-get update && apt-get install -y python3-dev build-essential

# Test OpenCV installation
pip install opencv-python-headless==4.8.0.76
python -c "import cv2; print('Success!')"
```