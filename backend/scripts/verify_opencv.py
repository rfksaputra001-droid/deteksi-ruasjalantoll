#!/usr/bin/env python3
"""
OpenCV Installation Verification Script
Verifies that OpenCV is properly installed and can import all required modules.
"""

import sys
import os
import platform

def test_opencv_import():
    """Test basic OpenCV import"""
    try:
        import cv2
        print(f"✅ OpenCV imported successfully - Version: {cv2.__version__}")
        return True
    except ImportError as e:
        print(f"❌ Failed to import OpenCV: {e}")
        return False

def test_opencv_functionality():
    """Test basic OpenCV functionality"""
    try:
        import cv2
        import numpy as np
        
        # Test basic image operations
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Test video codec support
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        print("✅ OpenCV functionality test passed")
        return True
    except Exception as e:
        print(f"❌ OpenCV functionality test failed: {e}")
        return False

def test_dependencies():
    """Test required dependencies"""
    dependencies = ['numpy', 'PIL', 'ultralytics']
    failed = []
    
    for dep in dependencies:
        try:
            if dep == 'PIL':
                import PIL
                print(f"✅ {dep} - Version: {PIL.__version__}")
            elif dep == 'ultralytics':
                import ultralytics
                print(f"✅ {dep} imported successfully")
            else:
                module = __import__(dep)
                version = getattr(module, '__version__', 'Unknown')
                print(f"✅ {dep} - Version: {version}")
        except ImportError as e:
            print(f"❌ Failed to import {dep}: {e}")
            failed.append(dep)
    
    return len(failed) == 0

def check_system_info():
    """Display system information"""
    print("\n📊 System Information:")
    print(f"Platform: {platform.platform()}")
    print(f"Python Version: {sys.version}")
    print(f"Python Executable: {sys.executable}")
    
    # Check for system libraries
    system_libs = [
        'libopencv_core.so',
        'libgomp.so.1',
        'libglib-2.0.so.0'
    ]
    
    print("\n🔍 System Libraries Check:")
    for lib in system_libs:
        try:
            # Try to find the library in common locations
            import ctypes
            ctypes.CDLL(lib)
            print(f"✅ {lib} found")
        except:
            print(f"⚠️  {lib} not found (may be okay if statically linked)")

def main():
    """Main verification function"""
    print("🔍 OpenCV Installation Verification")
    print("=" * 40)
    
    # System info
    check_system_info()
    print("\n" + "=" * 40)
    
    # Test imports
    print("🧪 Testing Imports:")
    opencv_ok = test_opencv_import()
    deps_ok = test_dependencies()
    
    print("\n" + "=" * 40)
    
    # Test functionality
    print("⚙️  Testing Functionality:")
    func_ok = test_opencv_functionality() if opencv_ok else False
    
    print("\n" + "=" * 40)
    
    # Final result
    if opencv_ok and deps_ok and func_ok:
        print("🎉 All tests passed! OpenCV is ready for use.")
        return 0
    else:
        print("💥 Some tests failed. Check the output above.")
        
        # Provide troubleshooting info
        print("\n🔧 Troubleshooting Tips:")
        if not opencv_ok:
            print("- Try: pip3 install --no-cache-dir opencv-python-headless==4.8.0.76")
            print("- Check system dependencies are installed")
        if not deps_ok:
            print("- Install missing dependencies with pip3")
        if not func_ok:
            print("- Check system libraries and OpenCV build configuration")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())