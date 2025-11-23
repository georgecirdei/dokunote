import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export interface AuthActionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Authentication helper functions
 * Provides utilities for session management and route protection
 */

/**
 * Get current session on server side
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Get current user with full profile
 */
export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      userTenants: {
        where: { isActive: true },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              subdomain: true,
              plan: true,
            },
          },
        },
      },
    },
  });

  return user;
}

/**
 * Get current tenant with user role
 */
export async function getCurrentTenant(tenantId?: string) {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return null;
  }

  const targetTenantId = tenantId || session.user.currentTenantId;
  
  if (!targetTenantId) {
    return null;
  }

  const tenant = await db.tenant.findUnique({
    where: { 
      id: targetTenantId,
      isActive: true,
    },
    include: {
      userTenants: {
        where: {
          userId: session.user.id,
          isActive: true,
        },
        select: {
          role: true,
          permissions: true,
          joinedAt: true,
        },
      },
      projects: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          isPublic: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5, // Recent projects
      },
      _count: {
        select: {
          projects: { where: { isActive: true } },
          userTenants: { where: { isActive: true } },
        },
      },
    },
  });

  return tenant;
}

/**
 * Check if user has access to tenant
 */
export async function hasTenantAccess(tenantId: string): Promise<boolean> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return false;
  }

  const access = await db.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId,
      },
      isActive: true,
    },
  });

  return !!access;
}

/**
 * Check if user has specific permission in tenant
 */
export async function hasPermission(
  permission: string, 
  tenantId?: string
): Promise<boolean> {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return false;
  }

  const targetTenantId = tenantId || session.user.currentTenantId;
  
  if (!targetTenantId) {
    return false;
  }

  const userTenant = await db.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId: targetTenantId,
      },
      isActive: true,
    },
    select: {
      role: true,
      permissions: true,
    },
  });

  if (!userTenant) {
    return false;
  }

  // Owner has all permissions
  if (userTenant.role === 'owner') {
    return true;
  }

  // Check specific permission
  const permissions = userTenant.permissions as Record<string, boolean>;
  return permissions[permission] === true;
}

/**
 * Require authentication - redirect if not authenticated
 */
export async function requireAuth(redirectTo = '/auth/sign-in') {
  const session = await getSession();
  
  if (!session?.user) {
    redirect(redirectTo);
  }
  
  return session;
}

/**
 * Require tenant access - redirect if no access (for pages)
 */
export async function requireTenantAccess(
  tenantId?: string,
  redirectTo = '/dashboard'
) {
  const session = await requireAuth();
  const targetTenantId = tenantId || session.user.currentTenantId;
  
  if (!targetTenantId) {
    redirect(redirectTo);
  }

  const hasAccess = await hasTenantAccess(targetTenantId);
  
  if (!hasAccess) {
    redirect(redirectTo);
  }

  return session;
}

/**
 * Require tenant access for API routes - throws error if no access
 */
export async function requireTenantAccessForAPI(tenantId?: string) {
  const session = await getSession();
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  const targetTenantId = tenantId || session.user.currentTenantId;
  
  if (!targetTenantId) {
    throw new Error('Tenant context required');
  }

  const access = await db.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId: targetTenantId,
      },
      isActive: true,
    },
  });

  if (!access) {
    throw new Error('Unauthorized tenant access');
  }

  return { session, access };
}

/**
 * Redirect authenticated users away from auth pages
 */
export async function redirectIfAuthenticated(redirectTo = '/dashboard') {
  const session = await getSession();
  
  if (session?.user) {
    redirect(redirectTo);
  }
}

/**
 * Get user's tenants with metadata
 */
export async function getUserTenants() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return [];
  }

  const userTenants = await db.userTenant.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          subdomain: true,
          plan: true,
          createdAt: true,
          _count: {
            select: {
              projects: { where: { isActive: true } },
              userTenants: { where: { isActive: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return userTenants.map(ut => ({
    ...ut.tenant,
    userRole: ut.role,
    userPermissions: ut.permissions,
    joinedAt: ut.joinedAt,
    projectCount: ut.tenant._count.projects,
    memberCount: ut.tenant._count.userTenants,
  }));
}

/**
 * Switch user's current tenant
 */
export async function switchTenant(tenantId: string): Promise<AuthActionResult> {
  try {
    const session = await requireAuth();

    // Verify user has access to the tenant
    const access = await db.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id,
          tenantId,
        },
        isActive: true,
      },
    });

    if (!access) {
      return {
        success: false,
        message: 'You do not have access to this organization',
      };
    }

    // Note: In a real implementation, you'd update the session
    // For now, we'll handle this in the client-side session update

    return {
      success: true,
      message: 'Organization switched successfully',
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to switch organization',
    };
  }
}
