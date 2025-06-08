/**
 * WebSocket server for TaskHero API
 * Provides real-time updates for kanban board and other UI components
 */

import { v4 as uuidv4 } from 'uuid';
import { websocketCorsConfig } from '../middleware/corsConfig.js';

// Store active connections
const connections = new Map();
const rooms = new Map(); // For project-specific updates

/**
 * Setup WebSocket server
 */
export function setupWebSocket(wss, logger) {
  wss.on('connection', (ws, req) => {
    const connectionId = uuidv4();
    const clientInfo = {
      id: connectionId,
      ws,
      projectRoot: null,
      rooms: new Set(),
      lastPing: Date.now(),
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };
    
    connections.set(connectionId, clientInfo);
    
    logger.info('WebSocket connection established', {
      connectionId,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      totalConnections: connections.size
    });
    
    // Send welcome message
    sendMessage(ws, {
      type: 'connection',
      data: {
        connectionId,
        message: 'Connected to TaskHero WebSocket server',
        timestamp: new Date().toISOString()
      }
    });
    
    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(connectionId, message, logger);
      } catch (error) {
        logger.error('Invalid WebSocket message', {
          connectionId,
          error: error.message,
          data: data.toString()
        });
        
        sendError(ws, 'INVALID_MESSAGE', 'Invalid JSON message format');
      }
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      handleDisconnection(connectionId, code, reason, logger);
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        connectionId,
        error: error.message
      });
      
      handleDisconnection(connectionId, 1006, 'Connection error', logger);
    });
    
    // Setup ping/pong for connection health
    ws.on('pong', () => {
      const connection = connections.get(connectionId);
      if (connection) {
        connection.lastPing = Date.now();
      }
    });
  });
  
  // Setup periodic ping to check connection health
  const pingInterval = setInterval(() => {
    const now = Date.now();
    const staleConnections = [];
    
    connections.forEach((connection, connectionId) => {
      if (now - connection.lastPing > 60000) { // 60 seconds timeout
        staleConnections.push(connectionId);
      } else {
        try {
          connection.ws.ping();
        } catch (error) {
          staleConnections.push(connectionId);
        }
      }
    });
    
    // Remove stale connections
    staleConnections.forEach(connectionId => {
      handleDisconnection(connectionId, 1001, 'Ping timeout', logger);
    });
    
    if (staleConnections.length > 0) {
      logger.info('Cleaned up stale WebSocket connections', {
        removedConnections: staleConnections.length,
        activeConnections: connections.size
      });
    }
  }, 30000); // Check every 30 seconds
  
  // Cleanup on server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval);
    connections.clear();
    rooms.clear();
  });
  
  logger.info('WebSocket server initialized');
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(connectionId, message, logger) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  const { type, data } = message;
  
  logger.debug('WebSocket message received', {
    connectionId,
    type,
    data
  });
  
  switch (type) {
    case 'join_project':
      handleJoinProject(connectionId, data, logger);
      break;
      
    case 'leave_project':
      handleLeaveProject(connectionId, data, logger);
      break;
      
    case 'subscribe_tasks':
      handleSubscribeTasks(connectionId, data, logger);
      break;
      
    case 'subscribe_prds':
      handleSubscribePrds(connectionId, data, logger);
      break;
      
    case 'ping':
      handlePing(connectionId, logger);
      break;
      
    default:
      logger.warn('Unknown WebSocket message type', {
        connectionId,
        type
      });
      
      sendError(connection.ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${type}`);
  }
}

/**
 * Handle project join
 */
function handleJoinProject(connectionId, data, logger) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  const { projectRoot } = data;
  if (!projectRoot) {
    sendError(connection.ws, 'MISSING_PROJECT_ROOT', 'Project root is required');
    return;
  }
  
  // Leave previous project if any
  if (connection.projectRoot) {
    leaveRoom(connectionId, `project:${connection.projectRoot}`);
  }
  
  // Join new project room
  connection.projectRoot = projectRoot;
  joinRoom(connectionId, `project:${projectRoot}`);
  
  logger.info('Client joined project', {
    connectionId,
    projectRoot
  });
  
  sendMessage(connection.ws, {
    type: 'project_joined',
    data: {
      projectRoot,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle project leave
 */
function handleLeaveProject(connectionId, data, logger) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  if (connection.projectRoot) {
    leaveRoom(connectionId, `project:${connection.projectRoot}`);
    
    logger.info('Client left project', {
      connectionId,
      projectRoot: connection.projectRoot
    });
    
    connection.projectRoot = null;
  }
  
  sendMessage(connection.ws, {
    type: 'project_left',
    data: {
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle task subscription
 */
function handleSubscribeTasks(connectionId, data, logger) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  joinRoom(connectionId, 'tasks');
  
  sendMessage(connection.ws, {
    type: 'tasks_subscribed',
    data: {
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle PRD subscription
 */
function handleSubscribePrds(connectionId, data, logger) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  joinRoom(connectionId, 'prds');
  
  sendMessage(connection.ws, {
    type: 'prds_subscribed',
    data: {
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle ping message
 */
function handlePing(connectionId, logger) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  connection.lastPing = Date.now();
  
  sendMessage(connection.ws, {
    type: 'pong',
    data: {
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle client disconnection
 */
function handleDisconnection(connectionId, code, reason, logger) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  // Leave all rooms
  connection.rooms.forEach(room => {
    leaveRoom(connectionId, room);
  });
  
  // Remove connection
  connections.delete(connectionId);
  
  logger.info('WebSocket connection closed', {
    connectionId,
    code,
    reason: reason?.toString(),
    totalConnections: connections.size
  });
}

/**
 * Join a room
 */
function joinRoom(connectionId, roomName) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  
  rooms.get(roomName).add(connectionId);
  connection.rooms.add(roomName);
}

/**
 * Leave a room
 */
function leaveRoom(connectionId, roomName) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  const room = rooms.get(roomName);
  if (room) {
    room.delete(connectionId);
    if (room.size === 0) {
      rooms.delete(roomName);
    }
  }
  
  connection.rooms.delete(roomName);
}

/**
 * Send message to a specific connection
 */
function sendMessage(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send error message
 */
function sendError(ws, code, message) {
  sendMessage(ws, {
    type: 'error',
    data: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Broadcast message to all connections in a room
 */
export function broadcastToRoom(roomName, message) {
  const room = rooms.get(roomName);
  if (!room) return;
  
  const messageStr = JSON.stringify(message);
  
  room.forEach(connectionId => {
    const connection = connections.get(connectionId);
    if (connection && connection.ws.readyState === connection.ws.OPEN) {
      connection.ws.send(messageStr);
    }
  });
}

/**
 * Broadcast task update
 */
export function broadcastTaskUpdate(projectRoot, task, action = 'updated') {
  const message = {
    type: 'task_update',
    data: {
      action,
      task,
      timestamp: new Date().toISOString()
    }
  };
  
  // Broadcast to project room and general tasks room
  broadcastToRoom(`project:${projectRoot}`, message);
  broadcastToRoom('tasks', message);
}

/**
 * Broadcast PRD update
 */
export function broadcastPrdUpdate(projectRoot, prd, action = 'updated') {
  const message = {
    type: 'prd_update',
    data: {
      action,
      prd,
      timestamp: new Date().toISOString()
    }
  };
  
  // Broadcast to project room and general PRDs room
  broadcastToRoom(`project:${projectRoot}`, message);
  broadcastToRoom('prds', message);
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return {
    totalConnections: connections.size,
    totalRooms: rooms.size,
    connectionsByRoom: Array.from(rooms.entries()).map(([room, connections]) => ({
      room,
      connections: connections.size
    }))
  };
}
