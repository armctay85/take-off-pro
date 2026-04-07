import { useEffect, useCallback, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CollaborationOptions {
  projectId?: number;
  onTaskUpdate?: (data: any) => void;
  onResourceAssignment?: (data: any) => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useCollaboration({
  projectId,
  onTaskUpdate,
  onResourceAssignment,
  onUserJoined,
  onUserLeft,
  onConnected,
  onDisconnected,
}: CollaborationOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const { toast } = useToast();
  const { user, isAuthenticated: authIsAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000;

  const connect = useCallback(() => {
    if (!projectId || !authIsAuthenticated || !user) {
      console.log("WebSocket: Cannot connect - missing projectId or auth");
      return;
    }

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/collaboration?projectId=${projectId}`;

    console.log("WebSocket: Connecting to", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket: Connection established");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Send authentication message immediately
      ws.send(
        JSON.stringify({
          type: "auth",
          userId: user.id,
          token: "session", // Session is verified via cookies
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log("WebSocket: Received message:", message.type);

        switch (message.type) {
          case "connection_established":
            // Server is ready, auth will be sent by onopen handler
            break;

          case "auth_success":
            console.log("WebSocket: Authentication successful");
            setIsAuthenticated(true);
            
            // Join project after successful auth
            ws.send(
              JSON.stringify({
                type: "join_project",
                projectId,
              })
            );
            break;

          case "auth_failed":
            console.error("WebSocket: Authentication failed", message.error);
            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: message.error || "Could not authenticate with collaboration server",
            });
            setIsAuthenticated(false);
            break;

          case "project_joined":
            console.log("WebSocket: Joined project", message.projectId);
            toast({
              title: "Connected",
              description: "Real-time collaboration enabled",
            });
            onConnected?.();
            break;

          case "task_updated":
            onTaskUpdate?.(message.task);
            toast({
              title: "Task Updated",
              description: `Task updated by a team member`,
            });
            break;

          case "resource_assigned":
            onResourceAssignment?.(message.assignment);
            toast({
              title: "Resource Assigned",
              description: `Resource assignment updated`,
            });
            break;

          case "user_joined":
            onUserJoined?.(message.userId);
            toast({
              title: "User Joined",
              description: "A team member joined the project",
            });
            break;

          case "user_left":
            onUserLeft?.(message.userId);
            toast({
              title: "User Left",
              description: "A team member left the project",
            });
            break;

          case "error":
            console.error("WebSocket error:", message.error);
            toast({
              variant: "destructive",
              title: "Error",
              description: message.error,
            });
            break;

          case "pong":
            // Heartbeat response
            break;

          default:
            console.log("WebSocket: Unknown message type", message.type);
        }
      } catch (error) {
        console.error("WebSocket: Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket: Connection error", error);
      setIsConnected(false);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to collaboration server",
      });
    };

    ws.onclose = (event) => {
      console.log("WebSocket: Connection closed", event.code, event.reason);
      setIsConnected(false);
      setIsAuthenticated(false);
      onDisconnected?.();

      // Don't show disconnect toast if it was a normal closure
      if (event.code !== 1000) {
        toast({
          variant: "destructive",
          title: "Disconnected",
          description: "Lost connection to collaboration server. Retrying...",
        });
      }

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(
          BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        reconnectAttemptsRef.current++;

        console.log(
          `WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
        );

        reconnectTimeoutRef.current = setTimeout(connect, delay);
      } else {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: "Could not reconnect to collaboration server. Please refresh the page.",
        });
      }
    };

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, [
    projectId,
    authIsAuthenticated,
    user,
    onTaskUpdate,
    onResourceAssignment,
    onUserJoined,
    onUserLeft,
    onConnected,
    onDisconnected,
    toast,
  ]);

  useEffect(() => {
    const cleanup = connect();
    return () => cleanup?.();
  }, [connect]);

  // Reset reconnect attempts when project changes
  useEffect(() => {
    reconnectAttemptsRef.current = 0;
  }, [projectId]);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && isAuthenticated) {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } else {
        console.warn("WebSocket: Cannot send message - not connected or authenticated");
        toast({
          variant: "destructive",
          title: "Connection Lost",
          description: "Cannot send message: trying to reconnect...",
        });
        return false;
      }
    },
    [isAuthenticated, toast]
  );

  const sendTaskUpdate = useCallback(
    (task: any) => {
      return sendMessage({
        type: "task_update",
        task,
      });
    },
    [sendMessage]
  );

  const sendResourceAssignment = useCallback(
    (assignment: any) => {
      return sendMessage({
        type: "resource_assignment",
        assignment,
      });
    },
    [sendMessage]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsAuthenticated(false);
  }, []);

  return {
    isConnected,
    isAuthenticated,
    sendTaskUpdate,
    sendResourceAssignment,
    disconnect,
  };
}

export default useCollaboration;
