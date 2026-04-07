import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { performHealthCheck } from "./health-check";
import { setupWebSocketServer } from "./services/websocket";
import { rateLimits } from "./middleware/rate-limit";
import { sanitizeInput, sanitizeNoSql } from "./middleware/sanitization";
import { globalErrorHandler, setupUnhandledRejectionHandler, notFoundHandler, requestTimeout } from "./middleware/error-handler";

// Set up unhandled rejection handler
setupUnhandledRejectionHandler();

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? process.env.ALLOWED_ORIGINS?.split(",") || []
    : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Request timeout
app.use(requestTimeout(30000));

// Input sanitization
app.use(sanitizeNoSql);
app.use(sanitizeInput);

// Apply rate limiting
app.use("/api/", rateLimits.api);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Health check endpoint (no auth required)
app.get('/api/health', async (_req, res) => {
  const healthCheck = await performHealthCheck();
  res.status(healthCheck.status === 'healthy' ? 200 : 503).json(healthCheck);
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Setup WebSocket server with security
    const wsService = setupWebSocketServer(server);
    
    // Graceful shutdown handler
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      // Close WebSocket connections
      if (wsService) {
        wsService.shutdown();
      }
      
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error("Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    };
    
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // 404 handler for API routes
    app.use("/api/*", notFoundHandler);

    // Global error handler - must be last
    app.use(globalErrorHandler);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🚀 Develoop Take-off Pro server running on port ${port}`);
      log(`📊 Health check: http://localhost:${port}/api/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
