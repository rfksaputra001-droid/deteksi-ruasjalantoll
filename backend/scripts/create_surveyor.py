"""
Script to create surveyor user
Run: python scripts/create_surveyor.py
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


async def create_surveyor():
    """Create surveyor user"""
    
    # Get MongoDB URI
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        print("❌ MONGODB_URI not set in environment variables")
        return
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_uri)
    db = client[os.getenv("DB_NAME", "yolo_detection")]
    
    # Surveyor details
    surveyor_data = {
        "namaUser": "Surveyor",
        "emailUser": "surveyor@surveyor.com",
        "passwordUser": hash_password("surveyor123"),
        "role": "surveyor",
        "isActive": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    # Check if surveyor exists
    existing = await db.users.find_one({"emailUser": surveyor_data["emailUser"]})
    if existing:
        print(f"⚠️ Surveyor dengan email {surveyor_data['emailUser']} sudah ada")
        client.close()
        return
    
    # Create surveyor
    result = await db.users.insert_one(surveyor_data)
    
    print("✅ Surveyor berhasil dibuat!")
    print(f"   ID: {result.inserted_id}")
    print(f"   Email: {surveyor_data['emailUser']}")
    print(f"   Password: surveyor123")
    print("\n⚠️ Segera ganti password setelah login!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_surveyor())
