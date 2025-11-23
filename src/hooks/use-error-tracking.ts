'use client';

import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

/**
 * Client-side error tracking hook
 * Captures and reports client-side errors to our monitoring system
 */

interface ErrorTrackingOptions {
  enableGlobalErrorHandler?: boolean;
  enableUnhandledRejectionHandler?: boolean;
  enablePerformanceTracking?: boolean;
  showToastOnError?: boolean;
  tenantId?: string;
  userId?: string;
}

interface ErrorData {
  message: string;
  error?: string;
  stack?: string;
  level: 'error' | 'warn' | 'info';
  context?: Record<string, any>;
  tenantId?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
}

export function useErrorTracking(options: ErrorTrackingOptions = {}) {
  const {
    enableGlobalErrorHandler = true,
    enableUnhandledRejectionHandler = true,
    enablePerformanceTracking = true,
    showToastOnError = true,
    tenantId,
    userId,
  } = options;

  const { toast } = useToast();

  /**
   * Track error to monitoring system
   */
  const trackError = useCallback(async (errorData: Omit<ErrorData, 'timestamp'>) => {
    try {
      const payload: ErrorData = {
        ...errorData,
        tenantId: errorData.tenantId || tenantId,
        userId: errorData.userId || userId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      // Send to monitoring endpoint
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId && { 'X-Tenant-ID': tenantId }),
          ...(userId && { 'X-User-ID': userId }),
        },
        body: JSON.stringify(payload),
      });

      console.error('Error tracked:', payload);
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
    }
  }, [tenantId, userId]);

  /**
   * Handle JavaScript errors
   */
  const handleError = useCallback((event: ErrorEvent) => {
    const { message, filename, lineno, colno, error } = event;

    trackError({
      message: message || 'Unknown JavaScript error',
      error: error?.message || message,
      stack: error?.stack,
      level: 'error',
      context: {
        filename,
        lineno,
        colno,
        type: 'javascript_error',
      },
    });

    if (showToastOnError) {
      toast({
        title: 'An error occurred',
        description: 'The error has been logged and will be investigated.',
        variant: 'destructive',
      });
    }
  }, [trackError, showToastOnError, toast]);

  /**
   * Handle unhandled promise rejections
   */
  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const error = event.reason;

    trackError({
      message: 'Unhandled promise rejection',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      level: 'error',
      context: {
        type: 'unhandled_rejection',
        reason: error,
      },
    });

    if (showToastOnError) {
      toast({
        title: 'An error occurred',
        description: 'The error has been logged and will be investigated.',
        variant: 'destructive',
      });
    }
  }, [trackError, showToastOnError, toast]);

  /**
   * Track performance metrics
   */
  const trackPerformance = useCallback(() => {
    if (!enablePerformanceTracking || typeof window === 'undefined') return;

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: 0,
          firstContentfulPaint: 0,
        };

        // Get paint metrics if available
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
          if (entry.name === 'first-paint') {
            metrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        }

        // Track significant metrics
        for (const [name, value] of Object.entries(metrics)) {
          if (value > 0) {
            fetch('/api/analytics/performance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(tenantId && { 'X-Tenant-ID': tenantId }),
                ...(userId && { 'X-User-ID': userId }),
              },
              body: JSON.stringify({
                name: `client_${name}`,
                value,
                unit: 'ms',
                tags: {
                  page: window.location.pathname,
                },
                tenantId,
                userId,
              }),
            }).catch(console.error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to track performance metrics:', error);
    }
  }, [enablePerformanceTracking, tenantId, userId]);

  /**
   * Set up error handlers
   */
  useEffect(() => {
    if (enableGlobalErrorHandler) {
      window.addEventListener('error', handleError);
    }

    if (enableUnhandledRejectionHandler) {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    // Track performance on page load
    if (enablePerformanceTracking) {
      if (document.readyState === 'complete') {
        setTimeout(trackPerformance, 1000);
      } else {
        window.addEventListener('load', () => {
          setTimeout(trackPerformance, 1000);
        });
      }
    }

    return () => {
      if (enableGlobalErrorHandler) {
        window.removeEventListener('error', handleError);
      }
      if (enableUnhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [
    enableGlobalErrorHandler,
    enableUnhandledRejectionHandler,
    enablePerformanceTracking,
    handleError,
    handleUnhandledRejection,
    trackPerformance,
  ]);

  /**
   * Manual error tracking function
   */
  const captureError = useCallback((
    error: Error | string,
    context?: Record<string, any>,
    level: 'error' | 'warn' | 'info' = 'error'
  ) => {
    trackError({
      message: typeof error === 'string' ? error : error.message,
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      level,
      context,
    });
  }, [trackError]);

  /**
   * Manual performance tracking
   */
  const capturePerformance = useCallback((
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' | 'percentage' = 'ms',
    tags?: Record<string, string>
  ) => {
    if (!enablePerformanceTracking) return;

    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId && { 'X-Tenant-ID': tenantId }),
        ...(userId && { 'X-User-ID': userId }),
      },
      body: JSON.stringify({
        name,
        value,
        unit,
        tags,
        tenantId,
        userId,
      }),
    }).catch(console.error);
  }, [enablePerformanceTracking, tenantId, userId]);

  return {
    captureError,
    capturePerformance,
    trackError,
  };
}

/**
 * Error boundary component HOC
 */
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: ErrorTrackingOptions = {}
) {
  const ErrorBoundaryWrapper = (props: T) => {
    const { captureError } = useErrorTracking(options);

    useEffect(() => {
      const handleComponentError = (error: Error, errorInfo: any) => {
        captureError(error, {
          componentStack: errorInfo.componentStack,
          type: 'react_error_boundary',
        });
      };

      // Note: This is a simplified version. In a real implementation,
      // you'd want to use a proper React Error Boundary class component
      window.addEventListener('error', (event) => {
        if (event.error) {
          handleComponentError(event.error, {});
        }
      });

      return () => {
        window.removeEventListener('error', () => {});
      };
    }, [captureError]);

    return React.createElement(Component, props);
  };

  return ErrorBoundaryWrapper;
}

export default useErrorTracking;
