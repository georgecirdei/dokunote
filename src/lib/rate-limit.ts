import { ContextLogger, logSecurityEvent } from './logger';

/**
 * Memory-based rate limiting for MVP
 * Upgradeable to Redis for production scaling
 */

interface RateLimitEntry {
  requests: number[];
  lastReset: number;
}

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (identifier: string, context?: any) => string;
  onLimitReached?: (identifier: string, context?: any) => void;
}

class MemoryRateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request should be rate limited
   */
  isLimited(identifier: string, config: RateLimitConfig, context?: any): boolean {
    const key = config.keyGenerator ? config.keyGenerator(identifier, context) : identifier;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create entry
    let entry = this.storage.get(key);
    if (!entry) {
      entry = { requests: [], lastReset: now };
      this.storage.set(key, entry);
    }

    // Remove old requests outside the window
    entry.requests = entry.requests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (entry.requests.length >= config.maxRequests) {
      // Log security event
      if (config.onLimitReached) {
        config.onLimitReached(identifier, context);
      }

      logSecurityEvent('rate_limit', {
        identifier: key,
        requestCount: entry.requests.length,
        limit: config.maxRequests,
        windowMs: config.windowMs,
      }, context);

      return true;
    }

    // Add current request
    entry.requests.push(now);
    return false;
  }

  /**
   * Get current usage for an identifier
   */
  getUsage(identifier: string, config: RateLimitConfig): {
    requests: number;
    remaining: number;
    resetTime: number;
  } {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    const entry = this.storage.get(key);
    if (!entry) {
      return {
        requests: 0,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }

    // Filter recent requests
    const recentRequests = entry.requests.filter(time => time > windowStart);
    
    return {
      requests: recentRequests.length,
      remaining: Math.max(0, config.maxRequests - recentRequests.length),
      resetTime: Math.min(...recentRequests) + config.windowMs,
    };
  }

  /**
   * Reset rate limit for identifier (admin function)
   */
  reset(identifier: string, config?: RateLimitConfig): void {
    const key = config?.keyGenerator ? config.keyGenerator(identifier) : identifier;
    this.storage.delete(key);
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours

    for (const [key, entry] of this.storage.entries()) {
      // Remove entries older than 24 hours
      entry.requests = entry.requests.filter(time => time > cutoff);
      
      // Remove empty entries
      if (entry.requests.length === 0 && entry.lastReset < cutoff) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Get storage stats (for monitoring)
   */
  getStats() {
    return {
      totalKeys: this.storage.size,
      memoryUsage: JSON.stringify([...this.storage.entries()]).length,
    };
  }

  /**
   * Cleanup on process exit
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new MemoryRateLimiter();

/**
 * Rate limiting configurations for different endpoints
 */
export const rateLimitConfigs = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Search endpoints (more restrictive)
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  // Authentication endpoints (very restrictive)
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },

  // Public documentation (more lenient)
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },

  // Analytics events (moderate)
  analytics: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
} as const;

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(
  configKey: keyof typeof rateLimitConfigs,
  identifierType: 'ip' | 'user' | 'tenant' | 'custom' = 'ip',
  customKeyGenerator?: (req: Request) => string
) {
  return function rateLimitMiddleware(handler: Function) {
    return async (req: Request) => {
      const config = rateLimitConfigs[configKey];
      
      // Generate identifier
      let identifier: string;
      switch (identifierType) {
        case 'ip':
          identifier = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
          break;
        case 'user':
          identifier = req.headers.get('x-user-id') || 'anonymous';
          break;
        case 'tenant':
          identifier = req.headers.get('x-tenant-id') || 'no-tenant';
          break;
        case 'custom':
          identifier = customKeyGenerator ? customKeyGenerator(req) : 'default';
          break;
        default:
          identifier = 'default';
      }

      // Check rate limit
      const context = {
        requestId: crypto.randomUUID(),
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent') || undefined,
        ipAddress: req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown',
        tenantId: req.headers.get('x-tenant-id') || undefined,
        userId: req.headers.get('x-user-id') || undefined,
      };

      if (rateLimiter.isLimited(identifier, config, context)) {
        const usage = rateLimiter.getUsage(identifier, config);
        
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${Math.ceil((usage.resetTime - Date.now()) / 1000)} seconds.`,
            retryAfter: Math.ceil((usage.resetTime - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((usage.resetTime - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(config.maxRequests),
              'X-RateLimit-Remaining': String(usage.remaining),
              'X-RateLimit-Reset': String(usage.resetTime),
            },
          }
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(req);
      const usage = rateLimiter.getUsage(identifier, config);

      // Clone response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(usage.remaining),
          'X-RateLimit-Reset': String(usage.resetTime),
        },
      });

      return newResponse;
    };
  };
}

/**
 * Simple rate limiting function for direct use
 */
export function rateLimit(
  identifier: string, 
  configKey: keyof typeof rateLimitConfigs = 'api',
  context?: any
): boolean {
  const config = rateLimitConfigs[configKey];
  return rateLimiter.isLimited(identifier, config, context);
}

/**
 * Get rate limit usage for monitoring
 */
export function getRateLimitUsage(
  identifier: string,
  configKey: keyof typeof rateLimitConfigs = 'api'
) {
  const config = rateLimitConfigs[configKey];
  return rateLimiter.getUsage(identifier, config);
}

/**
 * Reset rate limit for identifier (admin function)
 */
export function resetRateLimit(
  identifier: string,
  configKey: keyof typeof rateLimitConfigs = 'api'
) {
  const config = rateLimitConfigs[configKey];
  rateLimiter.reset(identifier, config);
}

/**
 * Get rate limiter statistics
 */
export function getRateLimiterStats() {
  return rateLimiter.getStats();
}

// Cleanup on process exit
process.on('exit', () => {
  rateLimiter.destroy();
});

export default rateLimiter;
