import { db } from '../db';
import { ContextLogger } from '../logger';

/**
 * Error monitoring and analytics system
 * Tracks errors, performance, and system health
 */

export interface ErrorEvent {
  message: string;
  error?: string;
  stack?: string;
  level: 'error' | 'warn' | 'info';
  context?: Record<string, any>;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  timestamp: Date;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  tags?: Record<string, string>;
  tenantId?: string;
  timestamp: Date;
}

export interface SystemHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  errorRate?: number;
  timestamp: Date;
  details?: Record<string, any>;
}

/**
 * Error monitoring service
 */
export class ErrorMonitor {
  private logger: ContextLogger;

  constructor(context?: any) {
    this.logger = new ContextLogger(context);
  }

  /**
   * Track error event
   */
  async trackError(event: Omit<ErrorEvent, 'timestamp'>) {
    try {
      const errorEvent: ErrorEvent = {
        ...event,
        timestamp: new Date(),
      };

      // Log the error
      this.logger.error(event.message, event.error, event.context);

      // Store in database if tenant context available
      if (event.tenantId) {
        await db.analyticsEvent.create({
          data: {
            tenantId: event.tenantId,
            userId: event.userId,
            type: 'error',
            data: {
              message: event.message,
              error: event.error,
              stack: event.stack,
              level: event.level,
              context: event.context,
              requestId: event.requestId,
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }

  /**
   * Track performance metric
   */
  async trackPerformance(metric: Omit<PerformanceMetric, 'timestamp'>) {
    try {
      const performanceMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date(),
      };

      // Log performance metric
      this.logger.info(`Performance metric: ${metric.name}`, {
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
      });

      // Store in database if tenant context available
      if (metric.tenantId) {
        await db.analyticsEvent.create({
          data: {
            tenantId: metric.tenantId,
            type: 'performance',
            data: {
              name: metric.name,
              value: metric.value,
              unit: metric.unit,
              tags: metric.tags,
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }

  /**
   * Check system health
   */
  async checkHealth(): Promise<SystemHealth> {
    const start = Date.now();

    try {
      // Test database connection
      await db.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      // Get recent error rate
      const recentErrors = await db.analyticsEvent.count({
        where: {
          type: 'error',
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
        },
      });

      const totalRequests = await db.analyticsEvent.count({
        where: {
          type: 'api_request',
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
        },
      });

      const errorRate = totalRequests > 0 ? (recentErrors / totalRequests) * 100 : 0;

      // Determine health status
      let status: SystemHealth['status'] = 'healthy';
      if (responseTime > 1000 || errorRate > 5) {
        status = 'degraded';
      }
      if (responseTime > 3000 || errorRate > 20) {
        status = 'unhealthy';
      }

      return {
        service: 'dokunote',
        status,
        responseTime,
        errorRate,
        timestamp: new Date(),
        details: {
          databaseResponseTime: responseTime,
          recentErrors,
          totalRequests,
          memoryUsage: process.memoryUsage(),
        },
      };
    } catch (error) {
      return {
        service: 'dokunote',
        status: 'unhealthy',
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get error statistics for dashboard
   */
  async getErrorStats(tenantId?: string, timeRange: '1h' | '24h' | '7d' | '30d' = '24h') {
    const timeMap = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - timeMap[timeRange]);

    const whereClause = {
      type: 'error',
      createdAt: { gte: since },
      ...(tenantId && { tenantId }),
    };

    const [totalErrors, errorsByLevel, errorTrends] = await Promise.all([
      // Total error count
      db.analyticsEvent.count({
        where: whereClause,
      }),

      // Errors grouped by level
      db.analyticsEvent.groupBy({
        by: ['data'],
        where: whereClause,
        _count: true,
      }),

      // Error trends over time
      db.analyticsEvent.findMany({
        where: whereClause,
        select: {
          createdAt: true,
          data: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Process error levels
    const levelCounts = errorsByLevel.reduce((acc: Record<string, number>, item) => {
      const level = (item.data as any)?.level || 'unknown';
      acc[level] = (acc[level] || 0) + item._count;
      return acc;
    }, {});

    // Process error trends (group by hour)
    const trendData = errorTrends.reduce((acc: Record<string, number>, event) => {
      const hour = new Date(event.createdAt).toISOString().slice(0, 13);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    return {
      totalErrors,
      errorsByLevel: levelCounts,
      errorTrends: Object.entries(trendData).map(([hour, count]) => ({
        time: hour,
        count,
      })),
      timeRange,
      generatedAt: new Date(),
    };
  }

  /**
   * Get top errors for dashboard
   */
  async getTopErrors(tenantId?: string, limit = 10) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const whereClause = {
      type: 'error',
      createdAt: { gte: since },
      ...(tenantId && { tenantId }),
    };

    const errors = await db.analyticsEvent.findMany({
      where: whereClause,
      select: {
        data: true,
        createdAt: true,
      },
    });

    // Group by error message
    const errorGroups = errors.reduce((acc: Record<string, any[]>, event) => {
      const message = (event.data as any)?.message || 'Unknown error';
      if (!acc[message]) {
        acc[message] = [];
      }
      acc[message].push(event);
      return acc;
    }, {});

    // Sort by frequency and format
    const topErrors = Object.entries(errorGroups)
      .map(([message, events]) => ({
        message,
        count: events.length,
        lastSeen: new Date(Math.max(...events.map(e => e.createdAt.getTime()))),
        firstSeen: new Date(Math.min(...events.map(e => e.createdAt.getTime()))),
        level: (events[0]?.data as any)?.level || 'unknown',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topErrors;
  }
}

// Global error monitor instance
export const errorMonitor = new ErrorMonitor();

/**
 * Express-style error handler
 */
export function handleError(error: Error, context?: Record<string, any>) {
  errorMonitor.trackError({
    message: error.message,
    error: error.message,
    stack: error.stack,
    level: 'error',
    context,
  });
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  tenantId?: string
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      await errorMonitor.trackPerformance({
        name,
        value: duration,
        unit: 'ms',
        tenantId,
      });
      
      resolve(result);
    } catch (error) {
      const duration = Date.now() - start;
      
      await errorMonitor.trackPerformance({
        name: `${name}_error`,
        value: duration,
        unit: 'ms',
        tenantId,
      });

      await errorMonitor.trackError({
        message: `Performance tracking error in ${name}`,
        error: error instanceof Error ? error.message : String(error),
        level: 'error',
        context: { name, duration },
        tenantId,
      });
      
      reject(error);
    }
  });
}

export default ErrorMonitor;
