"""
Socket.IO Manager for Real-time Communication
"""

import socketio
from app.utils.logger import logger

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'
)

# Create ASGI app
socket_app = socketio.ASGIApp(sio)


class SocketManager:
    """Socket.IO Manager for FastAPI integration"""
    
    def __init__(self):
        self.sio = sio
        self.app = socket_app
    
    def mount_to(self, app):
        """Mount Socket.IO to FastAPI app"""
        app.mount("/socket.io", self.app)
    
    async def emit_progress(self, tracking_id: str, data: dict):
        """Emit detection progress to clients"""
        import datetime
        
        event_data = {
            "trackingId": str(tracking_id),
            "timestamp": datetime.datetime.utcnow().isoformat(),
            **data
        }
        
        # Emit to specific tracking ID listener
        await self.sio.emit(f"detection-progress-{tracking_id}", event_data)
        
        # Emit to room
        await self.sio.emit("detection-progress", event_data, room=f"detection-{tracking_id}")
        
        # Global broadcast for completion/error
        if data.get("stage") in ["completed", "error"]:
            await self.sio.emit("detection-status-changed", event_data)
            logger.info(f"📢 Broadcasted detection-status-changed: {data.get('stage')} for {tracking_id}")


# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"🔌 Client connected: {sid}")


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"❌ Client disconnected: {sid}")


@sio.event
async def join_detection(sid, detection_id):
    """Join a detection room"""
    room = f"detection-{detection_id}"
    await sio.enter_room(sid, room)
    logger.info(f"📺 Client {sid} joined detection room: {detection_id}")


@sio.event
async def leave_detection(sid, detection_id):
    """Leave a detection room"""
    room = f"detection-{detection_id}"
    await sio.leave_room(sid, room)
    logger.info(f"📺 Client {sid} left detection room: {detection_id}")


# Create singleton instance
socket_manager = SocketManager()
