#!/usr/bin/env python3
"""
Pre-deployment OpenCV Test
Tests OpenCV installation in a Render-like environment before deploying
"""

import subprocess
import sys
import os
import tempfile

def run_command(cmd, description=""):
    """Run a command and return success status"""
    print(f"🔄 {description or cmd}")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✅ Success: {description or cmd}")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {description or cmd}")
        print(f"Error: {e.stderr}")
        return False, e.stderr

def test_opencv_installation():
    """Test OpenCV installation methods"""
    print("\n🧪 Testing OpenCV Installation Methods")
    print("=" * 50)
    
    methods = [
        {
            'name': 'Method 1: opencv-python-headless (recommended)',
            'command': 'pip3 install --no-cache-dir opencv-python-headless==4.8.0.76',
            'test': 'python3 -c "import cv2; print(f\'OpenCV {cv2.__version__} works!\')"'
        },
        {
            'name': 'Method 2: opencv-contrib-python-headless',
            'command': 'pip3 install --no-cache-dir opencv-contrib-python-headless==4.8.0.76',
            'test': 'python3 -c "import cv2; print(f\'OpenCV {cv2.__version__} works!\')"'
        },
        {
            'name': 'Method 3: System OpenCV',
            'command': 'apt-get install -y python3-opencv',
            'test': 'python3 -c "import cv2; print(f\'OpenCV {cv2.__version__} works!\')"'
        }
    ]
    
    for method in methods:
        print(f"\n🔍 {method['name']}")
        print("-" * 40)
        
        # Install
        success, output = run_command(method['command'], f"Installing {method['name']}")
        
        if success:
            # Test
            test_success, test_output = run_command(method['test'], "Testing import")
            if test_success:
                print(f"✅ {method['name']} - SUCCESS")
                print(f"Output: {test_output.strip()}")
                return method
        
        print(f"❌ {method['name']} - FAILED")
        
        # Cleanup
        run_command('pip3 uninstall -y opencv-python opencv-python-headless opencv-contrib-python opencv-contrib-python-headless', "Cleaning up")
    
    return None

def test_system_requirements():
    """Test system requirements for OpenCV"""
    print("\n🔧 Testing System Requirements")
    print("=" * 50)
    
    required_packages = [
        'python3',
        'python3-dev',
        'python3-pip',
        'build-essential',
        'libgl1-mesa-glx',
        'libglib2.0-0'
    ]
    
    success_count = 0
    for package in required_packages:
        success, _ = run_command(f'dpkg -l | grep {package}', f"Checking {package}")
        if success:
            success_count += 1
    
    print(f"\n📊 System Requirements: {success_count}/{len(required_packages)} satisfied")
    return success_count == len(required_packages)

def simulate_render_build():
    """Simulate Render build process"""
    print("\n🏗️  Simulating Render Build Process")
    print("=" * 50)
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        os.chdir(temp_dir)
        
        # Create requirements.txt
        requirements_content = """
opencv-python-headless==4.8.0.76
numpy==1.24.4
ultralytics==8.0.196
torch==2.1.0
torchvision==0.16.0
Pillow==10.1.0
        """.strip()
        
        with open('requirements.txt', 'w') as f:
            f.write(requirements_content)
        
        # Simulate build steps
        build_steps = [
            'python3 -m pip install --upgrade pip setuptools wheel',
            'pip3 install -r requirements.txt --no-cache-dir',
            'python3 -c "import cv2; import numpy as np; import torch; print(\'All imports successful!\')"'
        ]
        
        for step in build_steps:
            success, output = run_command(step, f"Build step: {step}")
            if not success:
                print(f"❌ Build simulation failed at: {step}")
                return False
        
        print("✅ Build simulation completed successfully!")
        return True

def main():
    """Main test function"""
    print("🚀 Pre-deployment OpenCV Test for Render.com")
    print("=" * 60)
    
    # Check if running as root (required for apt commands)
    if os.geteuid() != 0:
        print("⚠️  Warning: Running as non-root user. Some tests may fail.")
        print("   Run with sudo for complete testing.")
    
    # Test system requirements
    sys_ok = test_system_requirements()
    
    # Test OpenCV installation
    working_method = test_opencv_installation()
    
    # Simulate build
    build_ok = simulate_render_build()
    
    print("\n" + "=" * 60)
    print("📊 Final Results:")
    print(f"System Requirements: {'✅' if sys_ok else '❌'}")
    print(f"OpenCV Installation: {'✅' if working_method else '❌'}")
    print(f"Build Simulation: {'✅' if build_ok else '❌'}")
    
    if working_method:
        print(f"🎉 Recommended method: {working_method['name']}")
    
    if sys_ok and working_method and build_ok:
        print("🎉 All tests passed! Ready for Render deployment.")
        return 0
    else:
        print("💥 Some tests failed. Check troubleshooting guide.")
        return 1

if __name__ == "__main__":
    sys.exit(main())