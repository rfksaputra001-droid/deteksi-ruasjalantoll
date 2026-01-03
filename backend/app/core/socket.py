"""
Socket Manager Stub - REST-only mode
Socket.IO has been removed, this is a placeholder for backwards compatibility
"""

from app.utils.logger import logger

class SocketManagerStub:
    """Stub socket manager that does nothing - REST-only mode"""
    
    def __init__(self):
        logger.info("🔄 SocketManager stub initialized (REST-only mode)")
    
    async def emit_progress(self, tracking_id: str, data: dict):
        """No-op emit for backwards compatibility"""
        pass
    
    async def emit(self, event: str, data: dict, to: str = None):
        """No-op emit for backwards compatibility"""
        pass
    
    async def broadcast(self, event: str, data: dict):
        """No-op broadcast for backwards compatibility"""
        pass

# Create stub instance
socket_manager = SocketManagerStub()

logger.info("⚠️ Socket.IO disabled - using REST-only mode with polling")
