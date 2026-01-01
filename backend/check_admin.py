#!/usr/bin/env python3

import os
import sys
import asyncio
from pathlib import Path

# Add the backend-python directory to Python path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

# Now import modules
from app.config.database import get_collection
from app.utils.password import hash_password, verify_password

async def check_admin():
    """Check admin user in database"""
    try:
        users = get_collection("users")
        
        # Find all users
        cursor = users.find({})
        users_list = await cursor.to_list(length=10)
        
        print("=== ALL USERS ===")
        for user in users_list:
            print(f"Email: {user.get('emailUser')}")
            print(f"Name: {user.get('namaUser')}")
            print(f"Role: {user.get('role')}")
            print(f"Active: {user.get('isActive')}")
            print("---")
        
        # Check admin specifically
        admin = await users.find_one({"emailUser": "admin@admin.com"})
        if admin:
            print("\n=== ADMIN USER ===")
            print(f"Email: {admin['emailUser']}")
            print(f"Name: {admin['namaUser']}")
            print(f"Role: {admin['role']}")
            print(f"Active: {admin.get('isActive', True)}")
            
            # Test password
            stored_hash = admin.get('passwordUser', '')
            print(f"Password hash exists: {bool(stored_hash)}")
            
            if stored_hash:
                # Test different passwords
                passwords_to_test = ['admin123', 'Admin123!', 'admin@123']
                for pwd in passwords_to_test:
                    result = verify_password(pwd, stored_hash)
                    print(f"Password '{pwd}': {result}")
        else:
            print("\n❌ Admin user not found!")
            print("Creating admin user...")
            
            # Create admin
            admin_data = {
                "namaUser": "Administrator",
                "emailUser": "admin@admin.com",
                "passwordUser": hash_password("admin123"),
                "role": "admin",
                "isActive": True,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            result = await users.insert_one(admin_data)
            print(f"✅ Admin created with ID: {result.inserted_id}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    from datetime import datetime
    asyncio.run(check_admin())