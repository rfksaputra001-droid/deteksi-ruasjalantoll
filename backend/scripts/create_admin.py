"""
Script to create admin user
Run: python scripts/create_admin.py
"""

import asyncio
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.password import hash_password


async def create_admin():
    """Create admin user"""
    
    # Get MongoDB URI
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        print("❌ MONGODB_URI not set in environment variables")
        return
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_uri)
    db = client[os.getenv("DB_NAME", "yolo_detection")]
    
    # Admin details
    admin_data = {
        "namaUser": "Administrator",
        "emailUser": "admin@admin.com",
        "passwordUser": hash_password("admin123"),
        "role": "admin",
        "isActive": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    # Check if admin exists
    existing = await db.users.find_one({"emailUser": admin_data["emailUser"]})
    if existing:
        print(f"⚠️ Admin dengan email {admin_data['emailUser']} sudah ada")
        client.close()
        return
    
    # Create admin
    result = await db.users.insert_one(admin_data)
    
    print("✅ Admin berhasil dibuat!")
    print(f"   ID: {result.inserted_id}")
    print(f"   Email: {admin_data['emailUser']}")
    print(f"   Password: admin123")
    print("\n⚠️ Segera ganti password setelah login!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_admin())
