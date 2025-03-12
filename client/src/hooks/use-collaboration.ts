import { useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CollaborationOptions {
  projectId?: number;
  userId?: number;
  onTaskUpdate?: (data: any) => void;
  onResourceAssignment?: (data: any) => void;
  onUserJoined?: (userId: number) => void;
  onUserLeft?: (userId: number) => void;
}

export function useCollaboration({
  projectId,
  userId,
  onTaskUpdate,
  onResourceAssignment,
  onUserJoined,
  onUserLeft
}: CollaborationOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!projectId || !userId) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collaboration?projectId=${projectId}&userId=${userId}`;

    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
      toast({
        title: "Connected",
        description: "Real-time collaboration enabled",
      });

      ws.send(JSON.stringify({
        type: 'join_project',
        projectId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);

        switch (message.type) {
          case 'task_updated':
            onTaskUpdate?.(message.task);
            break;
          case 'resource_assigned':
            onResourceAssignment?.(message.assignment);
            break;
          case 'user_joined':
            onUserJoined?.(message.userId);
            toast({
              title: "User joined",
              description: "A new user joined the project",
            });
            break;
          case 'user_left':
            onUserLeft?.(message.userId);
            toast({
              title: "User left",
              description: "A user left the project",
            });
            break;
          case 'error':
            console.error('WebSocket error:', message.error);
            toast({
              variant: "destructive",
              title: "Error",
              description: message.error,
            });
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to collaboration server",
      });
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      toast({
        variant: "destructive",
        title: "Disconnected",
        description: "Lost connection to collaboration server",
      });

      // Attempt to reconnect after a delay, with increasing backoff
      const reconnectDelay = Math.min(1000 * (2 ** Math.floor(event.code / 1000)), 30000);
      reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
    };

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [projectId, userId, onTaskUpdate, onResourceAssignment, onUserJoined, onUserLeft, toast]);

  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  const sendTaskUpdate = useCallback((task: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'task_update',
        task
      }));
    } else {
      console.warn('Cannot send task update: WebSocket not connected');
      toast({
        variant: "destructive",
        title: "Connection Lost",
        description: "Cannot update task: trying to reconnect...",
      });
    }
  }, [toast]);

  const sendResourceAssignment = useCallback((assignment: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resource_assignment',
        assignment
      }));
    } else {
      console.warn('Cannot send resource assignment: WebSocket not connected');
      toast({
        variant: "destructive",
        title: "Connection Lost",
        description: "Cannot assign resource: trying to reconnect...",
      });
    }
  }, [toast]);

  return {
    sendTaskUpdate,
    sendResourceAssignment
  };
}