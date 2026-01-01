#!/usr/bin/env python3

import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime

# Add the backend-python directory to Python path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.config.database import get_collection
from bson import ObjectId

async def make_admin():
    """Make user admin"""
    try:
        users = get_collection("users")
        
        # Update the admin@yolo.com user to be admin role
        result = await users.update_one(
            {"emailUser": "admin@yolo.com"},
            {"$set": {
                "role": "admin",
                "updatedAt": datetime.utcnow()
            }}
        )
        
        if result.modified_count > 0:
            print("✅ User admin@yolo.com berhasil dijadikan admin")
        else:
            print("❌ User tidak ditemukan atau tidak diupdate")
            
        # Show current admin users
        admin_users = await users.find({"role": "admin"}).to_list(length=10)
        print(f"\n=== ADMIN USERS ({len(admin_users)}) ===")
        for admin in admin_users:
            print(f"- {admin['emailUser']} ({admin['namaUser']})")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(make_admin())