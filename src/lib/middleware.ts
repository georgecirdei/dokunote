import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from './logger';
import { createRateLimitMiddleware } from './rate-limit';
import { withTenantAuth } from './multitenancy';
import { errorMonitor } from './analytics/error-monitoring';
import { analyticsConfig } from '@/config/analytics';

/**
 * Comprehensive middleware factory for API routes
 * Combines logging, rate limiting, authentication, and monitoring
 */

export interface MiddlewareOptions {
  rateLimitType?: 'api' | 'search' | 'auth' | 'public' | 'analytics';
  requireAuth?: boolean;
  requireTenant?: boolean;
  trackPerformance?: boolean;
  customRateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Create comprehensive middleware stack for API routes
 */
export function withMiddleware(
  handler: (req: NextRequest) => Promise<Response>,
  options: MiddlewareOptions = {}
) {
  const {
    rateLimitType = 'api',
    requireAuth = false,
    requireTenant = false,
    trackPerformance = true,
    customRateLimit,
  } = options;

  // Build middleware stack from inside out
  let wrappedHandler = handler;

  // 1. Performance tracking (innermost)
  if (trackPerformance && analyticsConfig.performance.enabled) {
    wrappedHandler = withPerformanceTracking(wrappedHandler);
  }

  // 2. Error boundary
  wrappedHandler = withErrorBoundary(wrappedHandler);

  // 3. Authentication (if required)
  if (requireAuth || requireTenant) {
    wrappedHandler = withAuthentication(wrappedHandler);
  }

  // 4. Tenant authentication (if required)
  if (requireTenant) {
    wrappedHandler = withTenantAuth(wrappedHandler);
  }

  // 5. Rate limiting
  if (analyticsConfig.rateLimiting.enabled) {
    if (customRateLimit) {
      wrappedHandler = withCustomRateLimit(wrappedHandler, customRateLimit);
    } else {
      wrappedHandler = createRateLimitMiddleware(rateLimitType)(wrappedHandler);
    }
  }

  // 6. Request logging (outermost)
  wrappedHandler = withRequestLogging(wrappedHandler);

  return wrappedHandler;
}

/**
 * Performance tracking middleware
 */
function withPerformanceTracking(handler: Function) {
  return async (req: NextRequest) => {
    const start = Date.now();
    const url = new URL(req.url);
    const endpoint = url.pathname;
    
    try {
      const response = await handler(req);
      const duration = Date.now() - start;

      // Track successful request performance
      if (Math.random() < analyticsConfig.performance.sampleRate) {
        await errorMonitor.trackPerformance({
          name: `api_request_${endpoint}`,
          value: duration,
          unit: 'ms',
          tags: {
            method: req.method,
            status: response.status.toString(),
            endpoint,
          },
          tenantId: req.headers.get('x-tenant-id') || undefined,
        });
      }

      // Log slow requests
      if (duration > analyticsConfig.performance.slowRequestThreshold) {
        await errorMonitor.trackError({
          message: `Slow API request detected: ${endpoint}`,
          level: 'warn',
          context: {
            endpoint,
            method: req.method,
            duration,
            threshold: analyticsConfig.performance.slowRequestThreshold,
          },
          tenantId: req.headers.get('x-tenant-id') || undefined,
          requestId: crypto.randomUUID(),
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      // Track failed request performance
      await errorMonitor.trackPerformance({
        name: `api_request_error_${endpoint}`,
        value: duration,
        unit: 'ms',
        tags: {
          method: req.method,
          endpoint,
          error: 'true',
        },
        tenantId: req.headers.get('x-tenant-id') || undefined,
      });

      throw error;
    }
  };
}

/**
 * Error boundary middleware
 */
function withErrorBoundary(handler: Function) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      // Track the error
      await errorMonitor.trackError({
        message: 'Unhandled API error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        level: 'error',
        context: {
          method: req.method,
          url: req.url,
          headers: Object.fromEntries(req.headers.entries()),
        },
        tenantId: req.headers.get('x-tenant-id') || undefined,
        userId: req.headers.get('x-user-id') || undefined,
        requestId: crypto.randomUUID(),
      });

      // Return standardized error response
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : String(error))
            : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Authentication middleware using NextAuth
 */
function withAuthentication(handler: Function) {
  return async (req: NextRequest) => {
    try {
      const { getServerSession } = await import('next-auth');
      const { authOptions } = await import('./auth');
      
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Add user context to request headers
      const enhancedReq = new Request(req, {
        headers: {
          ...Object.fromEntries(req.headers.entries()),
          'x-user-id': session.user.id,
          'x-user-email': session.user.email,
          'x-current-tenant-id': session.user.currentTenantId || '',
          'x-current-tenant-role': session.user.currentTenantRole || 'viewer',
        },
      });

      return handler(enhancedReq);
      
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

/**
 * Custom rate limit middleware
 */
function withCustomRateLimit(
  handler: Function,
  config: { windowMs: number; maxRequests: number }
) {
  return createRateLimitMiddleware('api', 'ip', () => 'custom')(handler);
}

/**
 * CORS middleware for API routes
 */
export function withCORS(handler: Function, origins: string[] = ['http://localhost:3000']) {
  return async (req: NextRequest) => {
    const origin = req.headers.get('origin');
    const response = await handler(req);

    // Clone response to add CORS headers
    const corsResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    if (origin && origins.includes(origin)) {
      corsResponse.headers.set('Access-Control-Allow-Origin', origin);
    }

    corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID, X-User-ID');
    corsResponse.headers.set('Access-Control-Max-Age', '86400');

    return corsResponse;
  };
}

/**
 * Validation middleware using Zod schemas
 */
export function withValidation<T>(
  handler: Function,
  schema: { parse: (data: any) => T },
  target: 'body' | 'query' | 'params' = 'body'
) {
  return async (req: NextRequest) => {
    try {
      let data: any;

      switch (target) {
        case 'body':
          data = await req.json();
          break;
        case 'query':
          data = Object.fromEntries(new URL(req.url).searchParams.entries());
          break;
        case 'params':
          // Will need to be implemented based on route structure
          data = {};
          break;
      }

      const validatedData = schema.parse(data);
      
      // Add validated data to request (we'll need to find a way to pass this)
      // For now, we'll re-parse in the handler
      return handler(req);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: error instanceof Error ? error.message : 'Invalid input',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }
  };
}

/**
 * Common middleware configurations for different route types
 */
export const middlewarePresets = {
  // Public API routes (no auth required)
  publicApi: {
    rateLimitType: 'public' as const,
    requireAuth: false,
    requireTenant: false,
    trackPerformance: true,
  },

  // Protected API routes (auth required)
  protectedApi: {
    rateLimitType: 'api' as const,
    requireAuth: true,
    requireTenant: false,
    trackPerformance: true,
  },

  // Tenant-scoped API routes (auth + tenant required)
  tenantApi: {
    rateLimitType: 'api' as const,
    requireAuth: true,
    requireTenant: true,
    trackPerformance: true,
  },

  // Authentication routes (special rate limiting)
  auth: {
    rateLimitType: 'auth' as const,
    requireAuth: false,
    requireTenant: false,
    trackPerformance: true,
  },

  // Search routes (specialized rate limiting)
  search: {
    rateLimitType: 'search' as const,
    requireAuth: true,
    requireTenant: true,
    trackPerformance: true,
  },

  // Analytics routes (moderate rate limiting)
  analytics: {
    rateLimitType: 'analytics' as const,
    requireAuth: true,
    requireTenant: true,
    trackPerformance: false, // Avoid recursive performance tracking
  },
};

/**
 * Helper to create middleware with preset configurations
 */
export function withPreset(
  handler: (req: NextRequest) => Promise<Response>,
  preset: keyof typeof middlewarePresets
) {
  return withMiddleware(handler, middlewarePresets[preset]);
}

export default withMiddleware;
