#!/usr/bin/env python3
"""
Startup script untuk FastAPI + YOLO + OpenCV
Verifikasi semua dependencies sebelum start server
"""

import sys
import os

def verify_opencv():
    """Verify OpenCV installation"""
    try:
        import cv2
        print(f"✅ OpenCV {cv2.__version__}")
        
        # Test basic functionality
        import numpy as np
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return True
    except Exception as e:
        print(f"❌ OpenCV Error: {e}")
        return False

def verify_numpy():
    """Verify NumPy installation"""
    try:
        import numpy as np
        print(f"✅ NumPy {np.__version__}")
        return True
    except Exception as e:
        print(f"❌ NumPy Error: {e}")
        return False

def verify_torch():
    """Verify PyTorch installation"""
    try:
        import torch
        print(f"✅ PyTorch {torch.__version__}")
        print(f"   CUDA available: {torch.cuda.is_available()}")
        return True
    except Exception as e:
        print(f"❌ PyTorch Error: {e}")
        return False

def verify_yolo():
    """Verify YOLO installation"""
    try:
        from ultralytics import YOLO
        print(f"✅ Ultralytics YOLO")
        return True
    except Exception as e:
        print(f"❌ YOLO Error: {e}")
        return False

def verify_fastapi():
    """Verify FastAPI installation"""
    try:
        import fastapi
        print(f"✅ FastAPI {fastapi.__version__}")
        return True
    except Exception as e:
        print(f"❌ FastAPI Error: {e}")
        return False

def main():
    """Main verification"""
    print("=" * 50)
    print("🚀 Starting Application Verification")
    print("=" * 50)
    
    checks = [
        ("NumPy", verify_numpy),
        ("OpenCV", verify_opencv),
        ("PyTorch", verify_torch),
        ("YOLO", verify_yolo),
        ("FastAPI", verify_fastapi),
    ]
    
    failed = []
    for name, check in checks:
        if not check():
            failed.append(name)
    
    print("=" * 50)
    
    if failed:
        print(f"❌ Failed checks: {', '.join(failed)}")
        return 1
    
    print("✅ All checks passed! Starting server...")
    return 0

if __name__ == "__main__":
    sys.exit(main())
