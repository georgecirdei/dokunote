import { NextRequest } from 'next/server';
import { getUserTenants } from '@/features/auth/helpers';
import { withPreset } from '@/lib/middleware';

/**
 * Tenants API - Get user's accessible tenants
 * GET /api/tenants
 */
async function getTenants(req: NextRequest) {
  try {
    const tenants = await getUserTenants();
    
    return Response.json({
      tenants,
      count: tenants.length,
    });
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
    
    return Response.json(
      {
        error: 'Failed to fetch tenants',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply middleware (will require auth when implemented in Phase 2.2)
export const GET = withPreset(getTenants, 'protectedApi');
