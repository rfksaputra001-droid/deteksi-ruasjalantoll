/**
 * Enhanced Socket.IO Client with Authentication and Retry Logic
 * Production-ready WebSocket connection for real-time communication
 */

import { io } from 'socket.io-client';
import { SOCKET_URL, getUserFromToken, isTokenValid } from './api';

class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
    
    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.on = this.on.bind(this);
    this.emit = this.emit.bind(this);
  }

  /**
   * Connect to Socket.IO server with authentication
   */
  connect() {
    // Don't create multiple connections
    if (this.socket?.connected) {
      console.log('🔌 Socket.IO already connected');
      return this.socket;
    }

    // Get authentication data
    const token = localStorage.getItem('token');
    const userInfo = getUserFromToken();
    
    // Validate token before connecting
    if (!token || !isTokenValid()) {
      console.warn('⚠️ No valid token for Socket.IO connection');
      return null;
    }

    console.log('🔌 Initializing Socket.IO connection...', {
      url: SOCKET_URL,
      hasToken: !!token,
      user: userInfo?.email || 'unknown'
    });

    // Create socket with enhanced configuration
    this.socket = io(SOCKET_URL, {
      // Transport configuration - start with polling for better compatibility
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      
      // Connection settings
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      
      // CORS and credentials
      withCredentials: true,
      
      // Path configuration
      path: '/socket.io/',
      
      // Authentication payload
      auth: {
        token: token,
        user_id: userInfo?.id,
        user_email: userInfo?.email,
        user_role: userInfo?.role
      }
    });

    // Setup event handlers
    this.setupEventHandlers();
    
    return this.socket;
  }

  /**
   * Setup comprehensive Socket.IO event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection success
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully:', {
        id: this.socket.id,
        transport: this.socket.io.engine.transport.name,
        connected: this.socket.connected
      });
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Notify listeners
      this.notifyHandlers('connected', {
        sessionId: this.socket.id,
        transport: this.socket.io.engine.transport.name
      });
    });

    // Transport upgrade
    this.socket.io.engine.on('upgrade', () => {
      const transport = this.socket.io.engine.transport.name;
      console.log('⬆️ Socket.IO transport upgraded to:', transport);
    });

    // Server confirmation
    this.socket.on('connected', (data) => {
      console.log('🎉 Server confirmed connection:', data);
      this.notifyHandlers('server_connected', data);
    });

    // Disconnection handling
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.isConnected = false;
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        console.log('🔄 Server initiated disconnect, attempting reconnection...');
        // Server disconnected, manual reconnection needed
        setTimeout(() => this.socket?.connect(), 1000);
      } else if (reason === 'transport close') {
        console.log('📡 Transport closed, Socket.IO will auto-reconnect...');
      }
      
      this.notifyHandlers('disconnected', { reason });
    });

    // Connection errors
    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`🚫 Socket.IO connection error (attempt ${this.reconnectAttempts}):`, {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });

      // Handle specific error types
      if (error.message.includes('websocket error') || error.message.includes('xhr poll error')) {
        console.log('📡 Falling back to polling transport only...');
        this.socket.io.opts.transports = ['polling'];
      }

      // Handle authentication errors
      if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        console.error('🔒 Socket.IO authentication failed - token may be invalid');
        this.notifyHandlers('auth_error', { error: error.message });
        
        // Don't retry if auth fails
        this.disconnect();
        return;
      }

      // Give up after max attempts
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('💔 Socket.IO max reconnection attempts reached');
        this.notifyHandlers('connection_failed', { 
          attempts: this.reconnectAttempts,
          lastError: error.message 
        });
      }

      this.notifyHandlers('connect_error', { 
        error: error.message,
        attempt: this.reconnectAttempts 
      });
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyHandlers('reconnected', { attempts: attemptNumber });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}...`);
      this.notifyHandlers('reconnect_attempt', { attempt: attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🚫 Socket.IO reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💔 Socket.IO reconnection failed - all attempts exhausted');
      this.notifyHandlers('reconnect_failed');
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting Socket.IO...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);

    // Also register with socket if connected
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }

    // Also remove from socket if connected
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  /**
   * Emit event to server
   */
  emit(event, data) {
    if (this.socket && this.isConnected) {
      console.log('📤 Socket.IO emit:', { event, hasData: !!data });
      return this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Cannot emit - Socket.IO not connected');
      return false;
    }
  }

  /**
   * Join a room
   */
  joinRoom(room) {
    if (this.socket && this.isConnected) {
      console.log('🏠 Joining Socket.IO room:', room);
      this.socket.emit('join-room', { room });
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      console.log('🚪 Leaving Socket.IO room:', room);
      this.socket.emit('leave-room', { room });
    }
  }

  /**
   * Get connection status
   */
  get connected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  get id() {
    return this.socket?.id || null;
  }

  /**
   * Notify registered event handlers
   */
  notifyHandlers(event, data) {
    if (this.eventHandlers.has(event)) {
      for (const handler of this.eventHandlers.get(event)) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in Socket.IO event handler for '${event}':`, error);
        }
      }
    }
  }

  /**
   * Force reconnection
   */
  reconnect() {
    console.log('🔄 Force reconnecting Socket.IO...');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connected: this.isConnected,
      socketId: this.id,
      reconnectAttempts: this.reconnectAttempts,
      transport: this.socket?.io.engine.transport.name || null,
      eventHandlers: Array.from(this.eventHandlers.keys())
    };
  }
}

// Export singleton instance
export const socketClient = new SocketClient();

// Export class for custom instances if needed
export default SocketClient;