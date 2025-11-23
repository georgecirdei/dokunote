'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

/**
 * Tenant management hook
 * Provides tenant context, switching, and management utilities
 */

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
  plan: string;
  userRole: string;
  userPermissions: Record<string, boolean>;
  joinedAt: Date;
  projectCount: number;
  memberCount: number;
}

interface UseTenantReturn {
  // Current tenant
  currentTenant: Tenant | null;
  isLoading: boolean;
  error: string | null;

  // Available tenants
  tenants: Tenant[];
  
  // Actions
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
  
  // Permission helpers
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageProjects: boolean;
  canManageBilling: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

export function useTenant(): UseTenantReturn {
  const { user, isAuthenticated, switchTenant: authSwitchTenant } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get current tenant from available tenants
  const currentTenant = tenants.find(t => t.id === user?.currentTenantId) || null;

  /**
   * Fetch user's tenants
   */
  const fetchTenants = async () => {
    if (!isAuthenticated || !user?.id) {
      setTenants([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tenants', {
        headers: {
          'X-User-ID': user.id,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }

      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      setError('Failed to load organizations');
      toast({
        title: 'Failed to load organizations',
        description: 'Please refresh the page to try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switch to different tenant
   */
  const handleSwitchTenant = async (tenantId: string) => {
    try {
      await authSwitchTenant(tenantId);
      await fetchTenants(); // Refresh tenant data
    } catch (error) {
      console.error('Switch tenant error:', error);
    }
  };

  /**
   * Load tenants when user changes
   */
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchTenants();
    } else {
      setTenants([]);
    }
  }, [isAuthenticated, user?.id]);

  // Permission helpers
  const permissions = currentTenant?.userPermissions || {};
  const role = currentTenant?.userRole || '';

  const canManageUsers = role === 'owner' || permissions.canManageUsers === true;
  const canManageSettings = role === 'owner' || permissions.canManageSettings === true;
  const canManageProjects = role === 'owner' || permissions.canManageProjects === true;
  const canManageBilling = role === 'owner' || permissions.canManageBilling === true;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';

  return {
    currentTenant,
    isLoading,
    error,
    tenants,
    switchTenant: handleSwitchTenant,
    refreshTenants: fetchTenants,
    canManageUsers,
    canManageSettings,
    canManageProjects,
    canManageBilling,
    isOwner,
    isAdmin,
  };
}

/**
 * Hook to require tenant access
 * Redirects if user doesn't have access to current tenant
 */
export function useRequireTenant(tenantId?: string) {
  const { currentTenant, isLoading } = useTenant();
  const { user } = useAuth();

  const requiredTenantId = tenantId || user?.currentTenantId;
  const hasAccess = !requiredTenantId || currentTenant?.id === requiredTenantId;

  return {
    currentTenant,
    hasAccess,
    isLoading,
    requiredTenantId,
  };
}

export default useTenant;
