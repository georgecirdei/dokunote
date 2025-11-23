'use client';

import { useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

/**
 * Enhanced authentication hook with multi-tenant support
 * Provides authentication state, tenant context, and auth actions
 */

export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  image?: string;
  currentTenantId?: string;
  currentTenantRole?: string;
}

export interface UseAuthReturn {
  // Authentication state
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Tenant context
  currentTenantId?: string;
  currentTenantRole?: string;

  // Auth actions
  signIn: (provider?: string, options?: any) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Tenant actions
  switchTenant: (tenantId: string) => Promise<void>;
  
  // Permission helpers
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const user = session?.user as AuthUser | null;
  const isLoading = status === 'loading';
  const isAuthenticated = !!user;

  /**
   * Sign in with provider
   */
  const handleSignIn = async (provider = 'credentials', options: any = {}) => {
    try {
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: '/dashboard',
        ...options,
      });

      if (result?.error) {
        toast({
          title: 'Sign in failed',
          description: 'Please check your credentials and try again.',
          variant: 'destructive',
        });
        return;
      }

      if (result?.ok) {
        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.',
        });
        router.push(options.callbackUrl || '/dashboard');
        router.refresh();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: 'Sign in failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Sign out user
   */
  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: '/',
        redirect: false,
      });

      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: 'An error occurred while signing out.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Switch to different tenant
   */
  const switchTenant = async (tenantId: string) => {
    try {
      // Update session with new tenant context
      await update({
        user: {
          ...user,
          currentTenantId: tenantId,
        },
      });

      toast({
        title: 'Organization switched',
        description: 'Successfully switched to the selected organization.',
      });

      router.refresh();
    } catch (error) {
      console.error('Switch tenant error:', error);
      toast({
        title: 'Failed to switch organization',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role: string): boolean => {
    if (!user?.currentTenantRole) return false;
    return user.currentTenantRole === role;
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.currentTenantRole) return false;
    return roles.includes(user.currentTenantRole);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    currentTenantId: user?.currentTenantId,
    currentTenantRole: user?.currentTenantRole,
    signIn: handleSignIn,
    signOut: handleSignOut,
    switchTenant,
    hasRole,
    hasAnyRole,
  };
}

/**
 * Hook for requiring authentication
 * Redirects to sign-in if not authenticated
 */
export function useRequireAuth(redirectTo = '/auth/sign-in') {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook for protecting routes that require specific tenant access
 */
export function useRequireTenant(tenantId?: string, redirectTo = '/dashboard') {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }

      const requiredTenantId = tenantId || user.currentTenantId;
      
      if (!requiredTenantId) {
        router.push(redirectTo);
        return;
      }

      // Additional tenant access validation would go here
      // For now, we trust the session data
    }
  }, [user, isLoading, tenantId, redirectTo, router]);

  return { 
    user, 
    isLoading,
    currentTenantId: user?.currentTenantId,
    hasAccess: !!user?.currentTenantId,
  };
}

export default useAuth;
