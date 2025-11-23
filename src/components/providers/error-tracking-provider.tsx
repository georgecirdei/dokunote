'use client';

import { useEffect } from 'react';
import { useErrorTracking } from '@/hooks/use-error-tracking';

interface ErrorTrackingProviderProps {
  children: React.ReactNode;
  tenantId?: string;
  userId?: string;
}

/**
 * Global error tracking provider
 * Automatically captures client-side errors across the entire application
 */
export function ErrorTrackingProvider({ 
  children, 
  tenantId, 
  userId 
}: ErrorTrackingProviderProps) {
  // Initialize error tracking with global handlers
  useErrorTracking({
    enableGlobalErrorHandler: true,
    enableUnhandledRejectionHandler: true,
    enablePerformanceTracking: true,
    showToastOnError: true,
    tenantId,
    userId,
  });

  return <>{children}</>;
}
