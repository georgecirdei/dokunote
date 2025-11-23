import { NextRequest } from 'next/server';
import { runSecurityTestSuite } from '@/lib/security/tenant-isolation-tests';
import { withPreset } from '@/lib/middleware';
import { requireAuth } from '@/features/auth/helpers';

/**
 * Security testing endpoint for tenant isolation
 * POST /api/security/tenant-isolation
 * 
 * Note: This endpoint should only be available to administrators
 * and should be disabled in production or restricted to internal networks
 */
async function runIsolationTests(req: NextRequest) {
  try {
    // Ensure user is authenticated and is an admin/owner
    const session = await requireAuth();
    
    // Additional security: Only allow in development or for system admins
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to add additional checks:
      // - Check if user is system admin
      // - Check if request is from internal network
      // - Require special API key
      const isSystemAdmin = false; // TODO: Implement system admin check
      
      if (!isSystemAdmin) {
        return Response.json(
          { error: 'Access denied - system admin required' },
          { status: 403 }
        );
      }
    }

    // Run the security test suite
    const testResults = await runSecurityTestSuite();

    // Return detailed results
    return Response.json({
      ...testResults,
      metadata: {
        executedBy: session.user.id,
        environment: process.env.NODE_ENV,
        timestamp: new Date(),
      },
    });

  } catch (error) {
    console.error('Security test execution failed:', error);
    
    return Response.json(
      {
        error: 'Failed to execute security tests',
        message: error instanceof Error ? error.message : 'Unknown error',
        suiteName: 'Tenant Isolation Security Tests',
        overallPassed: false,
        results: [],
        duration: 0,
        executedAt: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get security test status and history
 * GET /api/security/tenant-isolation
 */
async function getTestHistory(req: NextRequest) {
  try {
    await requireAuth();
    
    // TODO: Implement test history storage and retrieval
    // For now, return placeholder response
    return Response.json({
      lastTest: null,
      testHistory: [],
      recommendations: [
        'Run tenant isolation tests after database schema changes',
        'Monitor test performance for regression detection',
        'Review failed tests immediately and patch security issues',
      ],
    });

  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch test history' },
      { status: 500 }
    );
  }
}

// Apply middleware (restrict to authenticated users)
export const POST = withPreset(runIsolationTests, 'protectedApi');
export const GET = withPreset(getTestHistory, 'protectedApi');
