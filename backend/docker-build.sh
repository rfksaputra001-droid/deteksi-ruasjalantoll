#!/bin/bash
# =============================================================================
# Docker Build & Test Script
# Build dan test Docker image secara lokal sebelum deploy ke Render
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

IMAGE_NAME="yolo-detection-api"
TAG="latest"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🐳 Docker Build & Test Script${NC}"
echo -e "${YELLOW}========================================${NC}"

# Step 1: Build Docker image
echo -e "\n${GREEN}📦 Step 1: Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${TAG} .

# Step 2: Check image size
echo -e "\n${GREEN}📊 Step 2: Checking image size...${NC}"
docker images ${IMAGE_NAME}:${TAG}

# Step 3: Test OpenCV import
echo -e "\n${GREEN}🧪 Step 3: Testing OpenCV import...${NC}"
docker run --rm ${IMAGE_NAME}:${TAG} python -c "
import cv2
import numpy as np
print(f'✅ OpenCV {cv2.__version__} works!')
print(f'✅ NumPy {np.__version__} works!')

# Test basic functionality
img = np.zeros((100, 100, 3), dtype=np.uint8)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
print('✅ OpenCV functionality test passed!')
"

# Step 4: Test YOLO import
echo -e "\n${GREEN}🎯 Step 4: Testing YOLO import...${NC}"
docker run --rm ${IMAGE_NAME}:${TAG} python -c "
from ultralytics import YOLO
import torch
print(f'✅ PyTorch {torch.__version__} works!')
print('✅ YOLO import works!')
"

# Step 5: Test FastAPI import
echo -e "\n${GREEN}🚀 Step 5: Testing FastAPI import...${NC}"
docker run --rm ${IMAGE_NAME}:${TAG} python -c "
import fastapi
import uvicorn
print(f'✅ FastAPI {fastapi.__version__} works!')
print('✅ Uvicorn works!')
"

# Step 6: Run container for manual testing (optional)
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}📝 To run the container locally:${NC}"
echo "docker run -p 8000:8000 --env-file .env ${IMAGE_NAME}:${TAG}"

echo -e "\n${YELLOW}📝 To push to Docker Hub (optional):${NC}"
echo "docker tag ${IMAGE_NAME}:${TAG} your-dockerhub-username/${IMAGE_NAME}:${TAG}"
echo "docker push your-dockerhub-username/${IMAGE_NAME}:${TAG}"

echo -e "\n${YELLOW}📝 To deploy to Render:${NC}"
echo "1. Push code to GitHub"
echo "2. Render will automatically detect Dockerfile"
echo "3. Or use render.yaml for configuration"
