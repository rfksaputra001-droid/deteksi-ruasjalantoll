"""
Complete Socket.IO Manager for Real-time Communication
Production-ready with comprehensive event handling
"""

import socketio
import asyncio
from typing import Dict, Set
from app.utils.logger import logger

# Create Socket.IO server with comprehensive options
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# Create ASGI app
socket_app = socketio.ASGIApp(sio)


class SocketManager:
    """Complete Socket.IO Manager for FastAPI integration"""
    
    def __init__(self):
        self.sio = sio
        self.app = socket_app
        self.connected_clients: Dict[str, Set[str]] = {}  # user_id -> {session_ids}
        self.tracking_rooms: Dict[str, Set[str]] = {}     # tracking_id -> {session_ids}
        self.setup_events()
    
    def setup_events(self):
        """Setup all Socket.IO event handlers"""
        
        @sio.event
        async def connect(sid, environ, auth):
            """Handle client connection"""
            logger.info(f"🔌 Socket.IO client connected: {sid}")
            
            # Extract user info from auth if provided
            user_id = None
            if auth and 'user_id' in auth:
                user_id = auth['user_id']
                
                # Track user connection
                if user_id not in self.connected_clients:
                    self.connected_clients[user_id] = set()
                self.connected_clients[user_id].add(sid)
                
                logger.info(f"👤 User {user_id} connected with session {sid}")
            
            # Send welcome message
            await sio.emit('connected', {
                'message': 'Connected to YOLO Detection Server',
                'session_id': sid,
                'timestamp': asyncio.get_event_loop().time()
            }, room=sid)
        
        @sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            logger.info(f"❌ Socket.IO client disconnected: {sid}")
            
            # Remove from all tracking
            for user_id, sessions in self.connected_clients.items():
                if sid in sessions:
                    sessions.remove(sid)
                    if not sessions:
                        del self.connected_clients[user_id]
                    break
            
            for tracking_id, sessions in list(self.tracking_rooms.items()):
                if sid in sessions:
                    sessions.remove(sid)
                    if not sessions:
                        del self.tracking_rooms[tracking_id]
        
        @sio.event
        async def join_detection(sid, data):
            """Join detection tracking room"""
            tracking_id = data.get('tracking_id')
            if not tracking_id:
                await sio.emit('error', {'message': 'tracking_id required'}, room=sid)
                return
            
            # Add to tracking room
            if tracking_id not in self.tracking_rooms:
                self.tracking_rooms[tracking_id] = set()
            self.tracking_rooms[tracking_id].add(sid)
            
            # Join Socket.IO room
            await sio.enter_room(sid, f"detection-{tracking_id}")
            
            logger.info(f"📺 Client {sid} joined detection room: {tracking_id}")
            
            await sio.emit('joined_detection', {
                'tracking_id': tracking_id,
                'message': f'Joined detection tracking for {tracking_id}'
            }, room=sid)
        
        @sio.event
        async def leave_detection(sid, data):
            """Leave detection tracking room"""
            tracking_id = data.get('tracking_id')
            if not tracking_id:
                return
            
            # Remove from tracking room
            if tracking_id in self.tracking_rooms and sid in self.tracking_rooms[tracking_id]:
                self.tracking_rooms[tracking_id].remove(sid)
                if not self.tracking_rooms[tracking_id]:
                    del self.tracking_rooms[tracking_id]
            
            # Leave Socket.IO room
            await sio.leave_room(sid, f"detection-{tracking_id}")
            
            logger.info(f"📺 Client {sid} left detection room: {tracking_id}")
        
        @sio.event
        async def ping(sid, data):
            """Handle ping for connection keepalive"""
            await sio.emit('pong', {'timestamp': asyncio.get_event_loop().time()}, room=sid)
    
    def mount_to(self, app):
        """Mount Socket.IO to FastAPI app"""
        app.mount("/socket.io", self.app)
        logger.info("🔌 Socket.IO mounted successfully")
    
    async def emit_progress(self, tracking_id: str, data: dict):
        """Emit detection progress to all interested clients"""
        import datetime
        
        event_data = {
            "trackingId": str(tracking_id),
            "timestamp": datetime.datetime.utcnow().isoformat(),
            **data
        }
        
        try:
            # Emit to specific tracking room
            room_name = f"detection-{tracking_id}"
            await self.sio.emit("detection-progress", event_data, room=room_name)
            
            # Also emit specific progress event
            await self.sio.emit(f"detection-progress-{tracking_id}", event_data)
            
            # Global broadcast for completion/error
            if data.get("stage") in ["completed", "error"]:
                await self.sio.emit("detection-status-changed", event_data)
                logger.info(f"📢 Broadcasted detection status: {data.get('stage')} for {tracking_id}")
            
            logger.debug(f"📡 Emitted progress for {tracking_id}: {data.get('stage', 'unknown')}")
            
        except Exception as e:
            logger.error(f"❌ Failed to emit progress: {e}")
    
    async def emit_to_user(self, user_id: str, event: str, data: dict):
        """Emit event to all sessions of a specific user"""
        if user_id in self.connected_clients:
            for session_id in self.connected_clients[user_id]:
                try:
                    await self.sio.emit(event, data, room=session_id)
                except Exception as e:
                    logger.error(f"Failed to emit to session {session_id}: {e}")
    
    async def broadcast(self, event: str, data: dict):
        """Broadcast event to all connected clients"""
        try:
            await self.sio.emit(event, data)
            logger.info(f"📢 Broadcasted event: {event}")
        except Exception as e:
            logger.error(f"❌ Failed to broadcast: {e}")
    
    def get_connected_count(self) -> int:
        """Get total number of connected clients"""
        return sum(len(sessions) for sessions in self.connected_clients.values())
    
    def get_tracking_count(self) -> int:
        """Get number of active tracking rooms"""
        return len(self.tracking_rooms)


# Global socket manager instance
socket_manager = SocketManager()
