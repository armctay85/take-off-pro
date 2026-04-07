import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

/**
 * In-memory rate limiter middleware
 * For production, consider using Redis for distributed rate limiting
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, skipSuccessfulRequests = false } = options;
  const clients = new Map<string, RateLimitEntry>();

  // Clean up expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clients.entries()) {
      if (entry.resetTime <= now) {
        clients.delete(key);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    // Use IP address + user ID (if authenticated) as identifier
    const userId = (req.session as any)?.userId;
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const identifier = userId ? `${ip}:${userId}` : ip;

    const now = Date.now();
    const entry = clients.get(identifier);

    if (!entry || entry.resetTime <= now) {
      // First request or window expired
      clients.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      
      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", (maxRequests - 1).toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000).toString());
      
      next();
    } else if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      });
    } else {
      // Increment counter
      entry.count++;
      
      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count).toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000).toString());
      
      if (skipSuccessfulRequests) {
        // Store original json to track if response was successful
        const originalJson = res.json.bind(res);
        res.json = function(body) {
          if (res.statusCode < 400) {
            entry.count = Math.max(0, entry.count - 1);
          }
          return originalJson(body);
        };
      }
      
      next();
    }
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimits = {
  // Strict limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  }),
  
  // Standard API limit
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  }),
  
  // Generous limit for data fetching
  read: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200
  }),
  
  // Strict limit for write operations
  write: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  })
};
