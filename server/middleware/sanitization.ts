import type { Request, Response, NextFunction } from "express";

// Common XSS patterns to sanitize
const XSS_PATTERNS = {
  scriptTag: /<script[^\u003e]*\b[^\u003e]*>.*?<\/script>/gi,
  eventHandler: /\s(on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))/gi,
  javascriptProtocol: /javascript:/gi,
  dataProtocol: /data:text\/html/gi,
  iframe: /<iframe[^\u003e]*\b[^\u003e]*>.*?<\/iframe>/gi,
  objectTag: /<object[^\u003e]*\b[^\u003e]*>.*?<\/object>/gi,
  embedTag: /<embed[^\u003e]*\b[^\u003e]*>/gi,
};

// SQL injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION\s+SELECT/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /DROP\s+TABLE/i
];

/**
 * Recursively sanitize a value
 */
function sanitizeValue(value: any): any {
  if (typeof value === "string") {
    let sanitized = value;
    
    // Remove script tags
    sanitized = sanitized.replace(XSS_PATTERNS.scriptTag, "[removed-script]");
    // Remove event handlers
    sanitized = sanitized.replace(XSS_PATTERNS.eventHandler, "");
    // Remove javascript protocol
    sanitized = sanitized.replace(XSS_PATTERNS.javascriptProtocol, "[removed-js]");
    // Remove data:text/html protocol
    sanitized = sanitized.replace(XSS_PATTERNS.dataProtocol, "[removed-data]");
    // Remove iframe
    sanitized = sanitized.replace(XSS_PATTERNS.iframe, "[removed-iframe]");
    // Remove object tags
    sanitized = sanitized.replace(XSS_PATTERNS.objectTag, "[removed-object]");
    // Remove embed tags
    sanitized = sanitized.replace(XSS_PATTERNS.embedTag, "[removed-embed]");
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (value !== null && typeof value === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitize keys too (prevent prototype pollution)
      const sanitizedKey = sanitizeValue(key);
      if (typeof sanitizedKey === "string" && !sanitizedKey.startsWith("__")) {
        sanitized[sanitizedKey] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Check for SQL injection patterns
 */
function detectSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Input sanitization middleware
 * Sanitizes all incoming request data (body, query, params)
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for SQL injection in raw input before sanitization
    const checkSqlInjection = (obj: any, path: string = ""): string | null => {
      if (typeof obj === "string") {
        if (detectSqlInjection(obj)) {
          return path;
        }
        return null;
      }
      
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          const result = checkSqlInjection(obj[i], `${path}[${i}]`);
          if (result) return result;
        }
        return null;
      }
      
      if (obj !== null && typeof obj === "object") {
        for (const [key, val] of Object.entries(obj)) {
          const result = checkSqlInjection(val, path ? `${path}.${key}` : key);
          if (result) return result;
        }
        return null;
      }
      
      return null;
    };
    
    // Check body for SQL injection
    if (req.body && Object.keys(req.body).length > 0) {
      const injectionPath = checkSqlInjection(req.body);
      if (injectionPath) {
        console.warn(`Potential SQL injection detected at: ${injectionPath}`);
        return res.status(400).json({
          error: "Invalid input",
          message: "Potentially malicious input detected"
        });
      }
      req.body = sanitizeValue(req.body);
    }
    
    // Check query parameters
    if (req.query) {
      const injectionPath = checkSqlInjection(req.query);
      if (injectionPath) {
        console.warn(`Potential SQL injection detected in query at: ${injectionPath}`);
        return res.status(400).json({
          error: "Invalid input",
          message: "Potentially malicious query parameter detected"
        });
      }
      req.query = sanitizeValue(req.query) as any;
    }
    
    // Sanitize params
    if (req.params) {
      req.params = sanitizeValue(req.params) as any;
    }
    
    next();
  } catch (error) {
    console.error("Error in sanitizeInput middleware:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to process input"
    });
  }
}

/**
 * Strict sanitization middleware that also validates input length
 * Use for user-generated content fields
 */
export function strictSanitize(maxLength: number = 10000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const checkLength = (obj: any): boolean => {
      if (typeof obj === "string" && obj.length > maxLength) {
        return false;
      }
      if (Array.isArray(obj)) {
        return obj.every(checkLength);
      }
      if (obj !== null && typeof obj === "object") {
        return Object.values(obj).every(checkLength);
      }
      return true;
    };
    
    if (!checkLength(req.body)) {
      return res.status(400).json({
        error: "Input too large",
        message: `Input exceeds maximum length of ${maxLength} characters`
      });
    }
    
    sanitizeInput(req, res, next);
  };
}

/**
 * Prevent NoSQL injection by sanitizing special operators
 */
export function sanitizeNoSql(req: Request, res: Response, next: NextFunction) {
  const dangerousKeys = [
    "$where", "$gt", "$gte", "$lt", "$lte", "$ne", "$in", 
    "$nin", "$exists", "$regex", "$options", "$or", "$and"
  ];
  
  const checkNoSqlOperators = (obj: any): boolean => {
    if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        if (dangerousKeys.some(dk => key.includes(dk))) {
          return true;
        }
        if (checkNoSqlOperators(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkNoSqlOperators(req.body)) {
    return res.status(400).json({
      error: "Invalid input",
      message: "Potentially dangerous query operator detected"
    });
  }
  
  next();
}
