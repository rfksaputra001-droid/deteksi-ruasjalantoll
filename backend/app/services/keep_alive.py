"""
Keep-Alive Service for Render Free Tier
Prevents cold starts by pinging the service periodically
"""

import asyncio
import aiohttp
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class KeepAliveService:
    """Service to keep Render free tier warm"""
    
    def __init__(self, base_url: str, ping_interval: int = 840):  # 14 minutes
        self.base_url = base_url
        self.ping_interval = ping_interval
        self.is_running = False
        self.ping_task = None
        
    async def start(self):
        """Start the keep-alive service"""
        if self.is_running:
            return
            
        self.is_running = True
        self.ping_task = asyncio.create_task(self._ping_loop())
        logger.info(f"🏓 Keep-alive service started - pinging every {self.ping_interval}s")
        
    async def stop(self):
        """Stop the keep-alive service"""
        self.is_running = False
        if self.ping_task:
            self.ping_task.cancel()
            try:
                await self.ping_task
            except asyncio.CancelledError:
                pass
        logger.info("🏓 Keep-alive service stopped")
        
    async def _ping_loop(self):
        """Internal ping loop"""
        while self.is_running:
            try:
                await asyncio.sleep(self.ping_interval)
                if self.is_running:
                    await self._ping_self()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Keep-alive ping failed: {e}")
                
    async def _ping_self(self):
        """Ping the service to prevent sleep"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get(f"{self.base_url}/health") as response:
                    if response.status == 200:
                        logger.debug(f"🏓 Keep-alive ping successful at {datetime.now()}")
                    else:
                        logger.warning(f"Keep-alive ping returned {response.status}")
        except Exception as e:
            logger.warning(f"Keep-alive ping error: {e}")


# Global instance
keep_alive_service = KeepAliveService(
    base_url="https://deteksi-ruasjalantoll.onrender.com",
    ping_interval=840  # 14 minutes (free tier sleeps after 15min)
)