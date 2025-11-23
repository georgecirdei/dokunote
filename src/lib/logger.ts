import pino from 'pino';
import { db } from './db';

/**
 * Enhanced logger with request tracking and structured context
 * Implements production-ready logging with tenant-scoped context
 */

export interface LogContext {
  userId?: string;
  tenantId?: string;
  requestId: string;
  userAgent?: string;
  ipAddress?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
}

// Create base pino logger
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    return pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Production: structured JSON logs
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => ({ level: label }),
      log: (object) => ({ 
        ...object, 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        service: 'dokunote',
      }),
    },
  });
};

export const logger = createLogger();

/**
 * Enhanced logger class with context management
 */
export class ContextLogger {
  private context: Partial<LogContext>;

  constructor(context: Partial<LogContext> = {}) {
    this.context = context;
  }

  private formatMessage(message: string, data?: Record<string, any>) {
    return {
      message,
      ...this.context,
      ...data,
    };
  }

  info(message: string, data?: Record<string, any>) {
    logger.info(this.formatMessage(message, data));
  }

  error(message: string, error?: Error | unknown, data?: Record<string, any>) {
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack, ...data }
      : { error: String(error), ...data };
    
    logger.error(this.formatMessage(message, errorData));
    
    // Store error in database for monitoring
    this.storeError(message, error, data).catch(console.error);
  }

  warn(message: string, data?: Record<string, any>) {
    logger.warn(this.formatMessage(message, data));
  }

  debug(message: string, data?: Record<string, any>) {
    logger.debug(this.formatMessage(message, data));
  }

  private async storeError(message: string, error?: Error | unknown, data?: Record<string, any>) {
    try {
      if (!this.context.tenantId) return; // Skip if no tenant context

      const errorData = {
        message,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: this.context,
        data,
        timestamp: new Date(),
      };

      // Store in analytics events for monitoring
      await db.analyticsEvent.create({
        data: {
          tenantId: this.context.tenantId,
          type: 'error',
          data: errorData,
          ipAddress: this.context.ipAddress,
          userAgent: this.context.userAgent,
          userId: this.context.userId,
        },
      });
    } catch (storeError) {
      // Fallback to console if database storage fails
      console.error('Failed to store error:', storeError);
    }
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: Partial<LogContext>) {
    return new ContextLogger({
      ...this.context,
      ...additionalContext,
    });
  }
}

/**
 * Request logging middleware for API routes
 */
export function withRequestLogging(handler: Function) {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();

    const context: LogContext = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent') || undefined,
      ipAddress: req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown',
      tenantId: req.headers.get('x-tenant-id') || undefined,
      userId: req.headers.get('x-user-id') || undefined,
    };

    const contextLogger = new ContextLogger(context);

    contextLogger.info('Request started', {
      path: new URL(req.url).pathname,
      query: new URL(req.url).searchParams.toString(),
    });

    try {
      const response = await handler(req);
      const duration = Date.now() - start;
      
      contextLogger.info('Request completed', {
        statusCode: response.status,
        duration,
      });

      // Track successful requests in analytics
      if (context.tenantId) {
        trackRequestEvent(context, response.status, duration).catch(console.error);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      contextLogger.error('Request failed', error, {
        duration,
      });

      throw error;
    }
  };
}

/**
 * Track request events for analytics
 */
async function trackRequestEvent(context: LogContext, statusCode: number, duration: number) {
  try {
    await db.analyticsEvent.create({
      data: {
        tenantId: context.tenantId!,
        type: 'api_request',
        data: {
          method: context.method,
          url: context.url,
          statusCode,
          duration,
          path: new URL(context.url!).pathname,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        userId: context.userId,
      },
    });
  } catch (error) {
      console.error('Failed to track request event:', error);
  }
}

/**
 * Create logger with specific context
 */
export function createContextLogger(context: Partial<LogContext>) {
  return new ContextLogger(context);
}

/**
 * Database query logging (enhanced from db.ts)
 */
export function logDatabaseQuery(query: string, params: any[], duration: number, context?: Partial<LogContext>) {
  const contextLogger = context ? new ContextLogger(context) : new ContextLogger();
  
  if (process.env.NODE_ENV === 'development') {
    contextLogger.debug('Database query executed', {
      query: query.slice(0, 200) + (query.length > 200 ? '...' : ''),
      paramCount: params.length,
      duration,
    });
  }
}

/**
 * Authentication event logging
 */
export function logAuthEvent(
  event: 'login' | 'logout' | 'register' | 'password_reset' | 'delete_account',
  userId: string,
  success: boolean,
  context?: Partial<LogContext>
) {
  const contextLogger = new ContextLogger({
    userId,
    ...context,
  });

  contextLogger.info(`Authentication event: ${event}`, {
    success,
    event,
  });
}

/**
 * Security event logging
 */
export function logSecurityEvent(
  event: 'rate_limit' | 'unauthorized_access' | 'suspicious_activity',
  details: Record<string, any>,
  context?: Partial<LogContext>
) {
  const contextLogger = new ContextLogger(context);

  contextLogger.warn(`Security event: ${event}`, {
    event,
    ...details,
  });
}

// Export default logger for simple use cases
export default logger;
