#!/usr/bin/env python3
"""
Startup script untuk FastAPI + YOLO + OpenCV
Verifikasi semua dependencies sebelum start server
"""

import sys
import os
import tempfile

def setup_directories():
    """Create necessary directories with proper permissions"""
    try:
        dirs_to_create = [
            '/tmp/matplotlib',
            '/app/.torch',
            '/app/.huggingface', 
            '/app/temp',
            '/app/uploads',
            '/app/uploads/detections'
        ]
        
        for directory in dirs_to_create:
            try:
                os.makedirs(directory, exist_ok=True, mode=0o755)
                # Test write permissions
                test_file = os.path.join(directory, '.test_write')
                with open(test_file, 'w') as f:
                    f.write('test')
                os.remove(test_file)
                print(f"✅ Directory ready: {directory}")
            except Exception as dir_error:
                print(f"⚠️ Directory issue {directory}: {dir_error}")
                # Try alternative temp directory
                if directory.startswith('/tmp'):
                    alt_dir = os.path.join(tempfile.gettempdir(), directory.split('/')[-1])
                    os.makedirs(alt_dir, exist_ok=True, mode=0o755)
                    print(f"✅ Alternative directory: {alt_dir}")
        
        return True
    except Exception as e:
        print(f"❌ Directory setup error: {e}")
        return False

def verify_opencv():
    """Verify OpenCV installation"""
    try:
        import cv2
        print(f"✅ OpenCV {cv2.__version__}")
        
        # Test basic functionality
        import numpy as np
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Test video codec
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        print(f"   Video codec: {fourcc}")
        
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
        print(f"   CPU threads: {torch.get_num_threads()}")
        return True
    except Exception as e:
        print(f"❌ PyTorch Error: {e}")
        return False

def verify_yolo():
    """Verify YOLO installation and download model if needed"""
    try:
        from ultralytics import YOLO
        print(f"✅ Ultralytics YOLO")
        
        # Try to load YOLOv8n model (smallest/fastest)
        model = YOLO('yolov8n.pt')
        print(f"   Model loaded: yolov8n.pt")
        
        return True
    except Exception as e:
        print(f"❌ YOLO Error: {e}")
        return False

def verify_fastapi():
    """Verify FastAPI installation"""
    try:
        import fastapi
        import uvicorn
        print(f"✅ FastAPI {fastapi.__version__}")
        return True
    except Exception as e:
        print(f"❌ FastAPI Error: {e}")
        return False

def check_system_resources():
    """Check system resources"""
    try:
        import psutil
        print(f"✅ CPU cores: {psutil.cpu_count()}")
        print(f"   Memory: {psutil.virtual_memory().total // (1024**3)} GB")
        print(f"   Disk: {psutil.disk_usage('/').free // (1024**3)} GB free")
        return True
    except:
        print("ℹ️  System resource check skipped")
        return True

def main():
    """Main verification"""
    print("=" * 60)
    print("🚀 FastAPI + YOLO + OpenCV Startup Verification")
    print("=" * 60)
    
    # Setup directories first
    if not setup_directories():
        return 1
    
    checks = [
        ("NumPy", verify_numpy),
        ("OpenCV", verify_opencv), 
        ("PyTorch", verify_torch),
        ("YOLO", verify_yolo),
        ("FastAPI", verify_fastapi),
        ("System Resources", check_system_resources),
    ]
    
    failed = []
    for name, check in checks:
        print(f"\n🔍 Checking {name}...")
        if not check():
            failed.append(name)
    
    print("=" * 60)
    
    if failed:
        print(f"❌ Failed checks: {', '.join(failed)}")
        print("🔧 Check the logs above for details")
        return 1
    
    print("✅ All checks passed! Ready to start server...")
    print("🌟 Starting FastAPI application...")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
