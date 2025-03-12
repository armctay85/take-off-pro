import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { parse } from 'url';

interface Client {
  id: string;
  ws: WebSocket;
  projectId?: number;
  userId?: number;
}

class CollaborationService {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();

  constructor(server: Server) {
    // Use path prefix to avoid conflict with Vite's HMR WebSocket
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/collaboration'
    });

    console.log('WebSocket server initialized on path: /ws/collaboration');
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const clientId = Math.random().toString(36).substring(7);
      const { query } = parse(request.url || '', true);

      console.log(`New WebSocket connection (${clientId}):`, {
        projectId: query.projectId,
        userId: query.userId
      });

      // Store client information
      this.clients.set(clientId, {
        id: clientId,
        ws,
        projectId: query.projectId ? Number(query.projectId) : undefined,
        userId: query.userId ? Number(query.userId) : undefined
      });

      // Handle incoming messages
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          console.log(`Received message from client ${clientId}:`, message);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        }
      });

      // Handle client disconnection
      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        this.handleDisconnection(clientId);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send initial connection success
      ws.send(JSON.stringify({
        type: 'connection_established',
        clientId
      }));
    });

    // Handle server-level errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private handleMessage(senderId: string, message: any) {
    const sender = this.clients.get(senderId);
    if (!sender) return;

    console.log(`Processing message from ${senderId}:`, message);

    switch (message.type) {
      case 'join_project':
        this.handleJoinProject(senderId, message.projectId);
        break;
      case 'task_update':
        this.broadcastToProject(sender.projectId!, {
          type: 'task_updated',
          task: message.task,
          updatedBy: sender.userId
        }, senderId);
        break;
      case 'resource_assignment':
        this.broadcastToProject(sender.projectId!, {
          type: 'resource_assigned',
          assignment: message.assignment,
          updatedBy: sender.userId
        }, senderId);
        break;
    }
  }

  private handleJoinProject(clientId: string, projectId: number) {
    const client = this.clients.get(clientId);
    if (client) {
      client.projectId = projectId;
      console.log(`Client ${clientId} joined project ${projectId}`);
      this.broadcastToProject(projectId, {
        type: 'user_joined',
        userId: client.userId
      });
    }
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client && client.projectId) {
      console.log(`Broadcasting user left for client ${clientId}`);
      this.broadcastToProject(client.projectId, {
        type: 'user_left',
        userId: client.userId
      });
    }
    this.clients.delete(clientId);
  }

  private broadcastToProject(projectId: number, message: any, excludeClientId?: string) {
    console.log(`Broadcasting to project ${projectId}:`, message);
    Array.from(this.clients.entries()).forEach(([clientId, client]) => {
      if (client.projectId === projectId && clientId !== excludeClientId) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to client ${clientId}:`, error);
        }
      }
    });
  }
}

export function setupWebSocketServer(server: Server) {
  return new CollaborationService(server);
}