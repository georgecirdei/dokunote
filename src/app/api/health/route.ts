import { NextRequest } from 'next/server';
import { errorMonitor } from '@/lib/analytics/error-monitoring';
import { withPreset } from '@/lib/middleware';

/**
 * Health check endpoint for monitoring
 * GET /api/health
 */
async function healthCheck(req: NextRequest) {
  const health = await errorMonitor.checkHealth();
  
  const status = health.status === 'healthy' ? 200 : 
                health.status === 'degraded' ? 200 : 503;

  return Response.json(health, { status });
}

// Apply comprehensive middleware
export const GET = withPreset(healthCheck, 'publicApi');
