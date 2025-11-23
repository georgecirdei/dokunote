import { NextRequest } from 'next/server';
import { errorMonitor } from '@/lib/analytics/error-monitoring';
import { getRateLimiterStats } from '@/lib/rate-limit';
import { withPreset } from '@/lib/middleware';

/**
 * Error monitoring dashboard endpoint
 * GET /api/monitoring/errors
 */
async function getErrorStats(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || undefined;
    const timeRange = (searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d') || '24h';
    const includeTop = searchParams.get('includeTop') === 'true';

    // Get error statistics
    const errorStats = await errorMonitor.getErrorStats(tenantId, timeRange);
    
    // Get top errors if requested
    const topErrors = includeTop 
      ? await errorMonitor.getTopErrors(tenantId, 10)
      : [];

    // Get system health
    const health = await errorMonitor.checkHealth();

    // Get rate limiter stats
    const rateLimiterStats = getRateLimiterStats();

    const response = {
      health: {
        status: health.status,
        responseTime: health.responseTime,
        errorRate: health.errorRate,
        timestamp: health.timestamp,
      },
      errors: errorStats,
      topErrors,
      rateLimiter: rateLimiterStats,
      metadata: {
        tenantId,
        timeRange,
        generatedAt: new Date(),
      },
    };

    return Response.json(response);
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to fetch error statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Log custom error event
 * POST /api/monitoring/errors
 */
async function logError(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, error, level = 'error', context, tenantId, userId } = body;

    if (!message) {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    await errorMonitor.trackError({
      message,
      error,
      level,
      context,
      tenantId,
      userId,
      requestId: crypto.randomUUID(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to log error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply comprehensive middleware
export const GET = withPreset(getErrorStats, 'analytics');
export const POST = withPreset(logError, 'analytics');
