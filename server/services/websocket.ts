import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import { parse as parseCookies } from 'cookie';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface Client {
  id: string;
  ws: WebSocketWithAlive;
  userId: string;
  projectId?: number;
  authenticated: boolean;
}

// Extend WebSocket type to include isAlive property
interface WebSocketWithAlive extends WebSocket {
  isAlive: boolean;
}

/**
 * Collaboration WebSocket Service
 * Handles real-time collaboration features with authentication
 */
export class CollaborationService {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/collaboration',
      // Add verification for connection origin
      verifyClient: async (info, callback) => {
        try {
          // Check authentication via session cookie
          const cookies = parseCookies(info.req.headers.cookie || '');
          const sessionId = cookies['connect.sid'];
          
          if (!sessionId) {
            console.log('WebSocket connection rejected: No session ID');
            callback(false, 401, 'Unauthorized');
            return;
          }

          // For now, allow connection - detailed auth happens in message handler
          // In production, you'd verify the session against your session store
          callback(true);
        } catch (error) {
          console.error('WebSocket verification error:', error);
          callback(false, 500, 'Internal Server Error');
        }
      }
    });

    console.log('🔌 WebSocket server initialized on path: /ws/collaboration');
    this.setupWebSocketServer();
    
    // Setup heartbeat to detect dead connections
    this.heartbeatInterval = setInterval(() => this.heartbeat(), 30000);
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketWithAlive, request) => {
      const clientId = this.generateClientId();
      const { query } = parse(request.url || '', true);

      console.log(`🔌 New WebSocket connection (${clientId})`);

      // Create client with pending auth status
      const client: Client = {
        id: clientId,
        ws,
        userId: '',
        projectId: query.projectId ? Number(query.projectId) : undefined,
        authenticated: false
      };

      this.clients.set(clientId, client);

      // Set up ping/pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`📨 Received message from client ${clientId}:`, message.type);
          
          await this.handleMessage(clientId, message);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        }
      });

      // Handle client disconnection
      ws.on('close', (code, reason) => {
        console.log(`🔌 Client disconnected: ${clientId} (code: ${code}, reason: ${reason})`);
        this.handleDisconnection(clientId);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
      });

      // Send initial connection success
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId,
        message: 'Please authenticate to continue'
      }));
    });

    // Handle server-level errors
    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  private async handleMessage(senderId: string, message: any) {
    const sender = this.clients.get(senderId);
    if (!sender) return;

    switch (message.type) {
      case 'auth':
        await this.handleAuth(senderId, message);
        break;
      
      case 'join_project':
        if (!sender.authenticated) {
          sender.ws.send(JSON.stringify({
            type: 'error',
            error: 'Not authenticated'
          }));
          return;
        }
        this.handleJoinProject(senderId, message.projectId);
        break;
      
      case 'task_update':
        if (!sender.authenticated || !sender.projectId) {
          sender.ws.send(JSON.stringify({
            type: 'error',
            error: 'Not in a project'
          }));
          return;
        }
        this.broadcastToProject(sender.projectId, {
          type: 'task_updated',
          task: message.task,
          updatedBy: sender.userId,
          timestamp: new Date().toISOString()
        }, senderId);
        break;
      
      case 'resource_assignment':
        if (!sender.authenticated || !sender.projectId) {
          sender.ws.send(JSON.stringify({
            type: 'error',
            error: 'Not in a project'
          }));
          return;
        }
        this.broadcastToProject(sender.projectId, {
          type: 'resource_assigned',
          assignment: message.assignment,
          updatedBy: sender.userId,
          timestamp: new Date().toISOString()
        }, senderId);
        break;
      
      case 'ping':
        sender.ws.send(JSON.stringify({ type: 'pong' }));
        break;
      
      default:
        sender.ws.send(JSON.stringify({
          type: 'error',
          error: 'Unknown message type'
        }));
    }
  }

  private async handleAuth(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Simple token-based auth (in production, verify JWT or session)
    const { userId, token } = message;
    
    if (!userId) {
      client.ws.send(JSON.stringify({
        type: 'auth_failed',
        error: 'User ID required'
      }));
      return;
    }

    // Verify user exists
    try {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        client.ws.send(JSON.stringify({
          type: 'auth_failed',
          error: 'User not found'
        }));
        return;
      }

      client.userId = userId;
      client.authenticated = true;

      client.ws.send(JSON.stringify({
        type: 'auth_success',
        userId
      }));

      console.log(`✅ Client ${clientId} authenticated as ${userId}`);
    } catch (error) {
      console.error('Auth error:', error);
      client.ws.send(JSON.stringify({
        type: 'auth_failed',
        error: 'Authentication failed'
      }));
    }
  }

  private handleJoinProject(clientId: string, projectId: number) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) return;

    client.projectId = projectId;
    console.log(`👤 Client ${clientId} joined project ${projectId}`);
    
    client.ws.send(JSON.stringify({
      type: 'project_joined',
      projectId
    }));

    this.broadcastToProject(projectId, {
      type: 'user_joined',
      userId: client.userId,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client && client.projectId && client.authenticated) {
      this.broadcastToProject(client.projectId, {
        type: 'user_left',
        userId: client.userId,
        timestamp: new Date().toISOString()
      });
    }
    this.clients.delete(clientId);
  }

  private broadcastToProject(projectId: number, message: any, excludeClientId?: string) {
    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (client.projectId === projectId && 
          clientId !== excludeClientId && 
          client.authenticated &&
          client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to client ${clientId}:`, error);
        }
      }
    });

    console.log(`📢 Broadcast to project ${projectId}: ${message.type} (${sentCount} recipients)`);
  }

  private heartbeat() {
    this.clients.forEach((client, clientId) => {
      const ws = client.ws;
      
      if (!ws.isAlive) {
        console.log(`💀 Terminating dead connection: ${clientId}`);
        ws.terminate();
        this.clients.delete(clientId);
        return;
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }

  private generateClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public method to gracefully shutdown
  shutdown() {
    console.log('🔄 Shutting down WebSocket server...');
    
    clearInterval(this.heartbeatInterval);
    
    // Close all client connections gracefully
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, 'Server shutting down');
      }
    });
    this.clients.clear();
    
    this.wss.close((err) => {
      if (err) {
        console.error('Error closing WebSocket server:', err);
      } else {
        console.log('✅ WebSocket server closed');
      }
    });
  }

  // Get connected clients count (for monitoring)
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // Get authenticated clients count
  getAuthenticatedClientsCount(): number {
    return Array.from(this.clients.values()).filter(c => c.authenticated).length;
  }
}

/**
 * Setup WebSocket server
 * Returns the CollaborationService instance for graceful shutdown
 */
export function setupWebSocketServer(server: Server): CollaborationService {
  return new CollaborationService(server);
}
