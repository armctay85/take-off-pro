import type { Request, Response, NextFunction } from "express";

/**
 * Custom application error class
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
export const Errors = {
  BadRequest: (message: string = "Bad request") => new AppError(message, 400),
  Unauthorized: (message: string = "Unauthorized") => new AppError(message, 401),
  Forbidden: (message: string = "Forbidden") => new AppError(message, 403),
  NotFound: (message: string = "Not found") => new AppError(message, 404),
  Conflict: (message: string = "Conflict") => new AppError(message, 409),
  ValidationError: (message: string = "Validation failed") => new AppError(message, 422),
  TooManyRequests: (message: string = "Too many requests") => new AppError(message, 429),
  InternalError: (message: string = "Internal server error") => new AppError(message, 500),
  ServiceUnavailable: (message: string = "Service unavailable") => new AppError(message, 503)
};

/**
 * Error response structure
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  stack?: string;
  timestamp: string;
  requestId: string;
}

/**
 * Generate unique request ID for error tracking
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Global error handler middleware
 * Should be the last middleware in the chain
 */
export function globalErrorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();
  
  // Determine if it's an operational error (expected) or programming error
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? (err as AppError).statusCode : 500;
  const isOperational = isAppError ? (err as AppError).isOperational : false;
  
  // Log error details
  console.error(`[ERROR ${requestId}]`, {
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    userId: (req.session as any)?.userId,
    stack: err.stack,
    timestamp
  });
  
  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: isOperational || process.env.NODE_ENV !== "production"
        ? err.message
        : "An unexpected error occurred"
    },
    timestamp,
    requestId
  };
  
  // Add error code for known error types
  if (statusCode === 400) errorResponse.error.code = "BAD_REQUEST";
  if (statusCode === 401) errorResponse.error.code = "UNAUTHORIZED";
  if (statusCode === 403) errorResponse.error.code = "FORBIDDEN";
  if (statusCode === 404) errorResponse.error.code = "NOT_FOUND";
  if (statusCode === 409) errorResponse.error.code = "CONFLICT";
  if (statusCode === 422) errorResponse.error.code = "VALIDATION_ERROR";
  if (statusCode === 429) errorResponse.error.code = "RATE_LIMIT_EXCEEDED";
  if (statusCode >= 500) errorResponse.error.code = "INTERNAL_ERROR";
  
  // Include stack trace in development
  if (process.env.NODE_ENV !== "production") {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
}

/**
 * Catch unhandled promise rejections
 */
export function setupUnhandledRejectionHandler() {
  process.on("unhandledRejection", (reason: any) => {
    console.error("Unhandled Promise Rejection:", reason);
    // In production, you might want to restart the process gracefully
    // process.exit(1);
  });
  
  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error);
    // Give time for logs to flush before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

/**
 * Wrap async route handlers to catch errors automatically
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: "ROUTE_NOT_FOUND"
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Request timeout middleware
 */
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: {
            message: "Request timeout",
            code: "REQUEST_TIMEOUT"
          }
        });
      }
    }, timeoutMs);
    
    res.on("finish", () => {
      clearTimeout(timeout);
    });
    
    next();
  };
}
