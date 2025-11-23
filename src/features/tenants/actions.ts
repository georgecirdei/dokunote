import { z } from 'zod';
import { requireAuth, requireTenantAccessForAPI } from '@/features/auth/helpers';
import { db } from '@/lib/db';
import { ContextLogger } from '@/lib/logger';
import { generateTenantSlug, isValidTenantSlug } from '@/lib/multitenancy';
import { createTenantSchema, updateTenantSchema, inviteUserSchema } from '@/lib/validation/tenant-schemas';

/**
 * Tenant management server actions
 * Handles tenant creation, updates, member management, and settings
 */

const tenantLogger = new ContextLogger({ requestId: 'tenant-actions' });

export interface TenantActionResult {
  success: boolean;
  message: string;
  tenantId?: string;
  error?: string;
}

export interface InviteResult {
  success: boolean;
  message: string;
  inviteId?: string;
  error?: string;
}

/**
 * Create new tenant/organization
 */
export async function createTenant(formData: FormData): Promise<TenantActionResult> {
  try {
    const session = await requireAuth();
    
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      website: formData.get('website') as string || undefined,
      subdomain: formData.get('subdomain') as string || undefined,
    };

    // Validate input
    const validatedData = createTenantSchema.parse(rawData);

    tenantLogger.info('Tenant creation attempt', {
      userId: session.user.id,
      tenantName: validatedData.name,
      hasSubdomain: !!validatedData.subdomain,
    });

    // Generate slug if not provided
    const slug = await generateTenantSlug(validatedData.name);
    
    // Use provided subdomain or generated slug
    const subdomain = validatedData.subdomain || slug;

    // Check if subdomain is available
    const existingTenant = await db.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      return {
        success: false,
        message: 'This subdomain is already taken. Please choose a different one.',
      };
    }

    // Create tenant
    const tenant = await db.tenant.create({
      data: {
        name: validatedData.name,
        slug,
        subdomain,
        description: validatedData.description,
        website: validatedData.website,
        plan: 'free',
        settings: {
          allowPublicSignup: false,
          requireEmailVerification: true,
          defaultUserRole: 'viewer',
          enableAnalytics: true,
          enablePublicDocs: true,
        },
      },
    });

    // Add creator as owner
    await db.userTenant.create({
      data: {
        userId: session.user.id,
        tenantId: tenant.id,
        role: 'owner',
        permissions: {
          canManageUsers: true,
          canManageSettings: true,
          canManageProjects: true,
          canManageBilling: true,
          canDeleteTenant: true,
        },
      },
    });

    tenantLogger.info('Tenant created successfully', {
      userId: session.user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      subdomain: tenant.subdomain,
    });

    return {
      success: true,
      message: 'Organization created successfully!',
      tenantId: tenant.id,
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.issues[0].message,
      };
    }

    tenantLogger.error('Tenant creation failed', error, {
      userId: (await requireAuth()).user.id,
    });

    return {
      success: false,
      message: 'Failed to create organization. Please try again.',
    };
  }
}

/**
 * Update tenant settings
 */
export async function updateTenant(
  tenantId: string, 
  formData: FormData
): Promise<TenantActionResult> {
  try {
    const { session, access } = await requireTenantAccessForAPI(tenantId);
    
    // Check if user can manage settings
    if (access.role !== 'owner' && !(access.permissions as any)?.canManageSettings) {
      return {
        success: false,
        message: 'You do not have permission to update organization settings.',
      };
    }

    const rawData = {
      name: formData.get('name') as string || undefined,
      description: formData.get('description') as string || undefined,
      website: formData.get('website') as string || undefined,
      subdomain: formData.get('subdomain') as string || undefined,
    };

    // Validate input
    const validatedData = updateTenantSchema.parse(rawData);

    // Check subdomain availability if changing
    if (validatedData.subdomain) {
      const existingTenant = await db.tenant.findFirst({
        where: { 
          subdomain: validatedData.subdomain,
          id: { not: tenantId },
        },
      });

      if (existingTenant) {
        return {
          success: false,
          message: 'This subdomain is already taken. Please choose a different one.',
        };
      }
    }

    // Update tenant
    const updatedTenant = await db.tenant.update({
      where: { id: tenantId },
      data: {
        ...validatedData,
      },
    });

    tenantLogger.info('Tenant updated successfully', {
      userId: session.user.id,
      tenantId,
      updatedFields: Object.keys(validatedData).filter(key => 
        validatedData[key as keyof typeof validatedData] !== undefined
      ),
    });

    return {
      success: true,
      message: 'Organization updated successfully!',
      tenantId: updatedTenant.id,
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.issues[0].message,
      };
    }

    tenantLogger.error('Tenant update failed', error);
    return {
      success: false,
      message: 'Failed to update organization. Please try again.',
    };
  }
}

/**
 * Invite user to tenant
 */
export async function inviteUserToTenant(
  tenantId: string,
  formData: FormData
): Promise<InviteResult> {
  try {
    const { session, access } = await requireTenantAccessForAPI(tenantId);
    
    // Check if user can manage users
    if (access.role !== 'owner' && !(access.permissions as any)?.canManageUsers) {
      return {
        success: false,
        message: 'You do not have permission to invite users.',
      };
    }

    const rawData = {
      email: formData.get('email') as string,
      role: formData.get('role') as string || 'viewer',
      message: formData.get('message') as string || undefined,
    };

    // Validate input
    const validatedData = inviteUserSchema.parse(rawData);

    tenantLogger.info('User invitation attempt', {
      userId: session.user.id,
      tenantId,
      inviteEmail: validatedData.email,
      inviteRole: validatedData.role,
    });

    // Check if user already exists and has access to tenant
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
      include: {
        userTenants: {
          where: { tenantId, isActive: true },
        },
      },
    });

    if (existingUser?.userTenants && existingUser.userTenants.length > 0) {
      return {
        success: false,
        message: 'This user is already a member of this organization.',
      };
    }

    // For now, directly add user if they exist, or store invitation for later
    if (existingUser) {
      // Add existing user to tenant
      await db.userTenant.create({
        data: {
          userId: existingUser.id,
          tenantId,
          role: validatedData.role,
          permissions: getRolePermissions(validatedData.role),
        },
      });

      tenantLogger.info('Existing user added to tenant', {
        userId: session.user.id,
        tenantId,
        invitedUserId: existingUser.id,
        role: validatedData.role,
      });

      return {
        success: true,
        message: `${validatedData.email} has been added to the organization.`,
      };
    } else {
      // TODO: Implement email invitation system in future phase
      // For MVP, we'll just return a message
      tenantLogger.info('User invitation stored (email system pending)', {
        userId: session.user.id,
        tenantId,
        inviteEmail: validatedData.email,
        inviteRole: validatedData.role,
      });

      return {
        success: true,
        message: `Invitation will be sent to ${validatedData.email} when email system is implemented.`,
      };
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.issues[0].message,
      };
    }

    tenantLogger.error('User invitation failed', error);
    return {
      success: false,
      message: 'Failed to invite user. Please try again.',
    };
  }
}

/**
 * Update user role in tenant
 */
export async function updateUserRole(
  tenantId: string,
  userId: string,
  role: string
): Promise<TenantActionResult> {
  try {
    const { session, access } = await requireTenantAccessForAPI(tenantId);
    
    // Check permissions
    if (access.role !== 'owner' && !(access.permissions as any)?.canManageUsers) {
      return {
        success: false,
        message: 'You do not have permission to manage user roles.',
      };
    }

    // Prevent user from changing their own role if they're the only owner
    if (userId === session.user.id && access.role === 'owner') {
      const ownerCount = await db.userTenant.count({
        where: { 
          tenantId, 
          role: 'owner',
          isActive: true,
        },
      });

      if (ownerCount <= 1) {
        return {
          success: false,
          message: 'Cannot change your role as the only owner. Promote another member to owner first.',
        };
      }
    }

    // Update role
    await db.userTenant.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: {
        role,
        permissions: getRolePermissions(role),
      },
    });

    tenantLogger.info('User role updated', {
      userId: session.user.id,
      tenantId,
      targetUserId: userId,
      newRole: role,
    });

    return {
      success: true,
      message: 'User role updated successfully.',
    };

  } catch (error) {
    tenantLogger.error('User role update failed', error);
    return {
      success: false,
      message: 'Failed to update user role. Please try again.',
    };
  }
}

/**
 * Remove user from tenant
 */
export async function removeUserFromTenant(
  tenantId: string,
  userId: string
): Promise<TenantActionResult> {
  try {
    const { session, access } = await requireTenantAccessForAPI(tenantId);
    
    // Check permissions
    if (access.role !== 'owner' && !(access.permissions as any)?.canManageUsers) {
      return {
        success: false,
        message: 'You do not have permission to remove users.',
      };
    }

    // Prevent removing the only owner
    if (userId === session.user.id && access.role === 'owner') {
      const ownerCount = await db.userTenant.count({
        where: { 
          tenantId, 
          role: 'owner',
          isActive: true,
        },
      });

      if (ownerCount <= 1) {
        return {
          success: false,
          message: 'Cannot remove yourself as the only owner. Transfer ownership first.',
        };
      }
    }

    // Soft delete (set isActive to false)
    await db.userTenant.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: {
        isActive: false,
      },
    });

    tenantLogger.warn('User removed from tenant', {
      userId: session.user.id,
      tenantId,
      removedUserId: userId,
    });

    return {
      success: true,
      message: 'User removed from organization.',
    };

  } catch (error) {
    tenantLogger.error('User removal failed', error);
    return {
      success: false,
      message: 'Failed to remove user. Please try again.',
    };
  }
}

/**
 * Delete tenant (owner only)
 */
export async function deleteTenant(tenantId: string): Promise<TenantActionResult> {
  try {
    const { session, access } = await requireTenantAccessForAPI(tenantId);
    
    // Only owners can delete tenants
    if (access.role !== 'owner') {
      return {
        success: false,
        message: 'Only organization owners can delete organizations.',
      };
    }

    // Get tenant details for logging
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });

    // Soft delete tenant (set isActive to false)
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        isActive: false,
      },
    });

    tenantLogger.warn('Tenant deleted', {
      userId: session.user.id,
      tenantId,
      tenantName: tenant?.name,
      tenantSlug: tenant?.slug,
    });

    return {
      success: true,
      message: 'Organization deleted successfully.',
    };

  } catch (error) {
    tenantLogger.error('Tenant deletion failed', error);
    return {
      success: false,
      message: 'Failed to delete organization. Please try again.',
    };
  }
}

/**
 * Get role-based permissions
 */
function getRolePermissions(role: string): Record<string, boolean> {
  switch (role) {
    case 'owner':
      return {
        canManageUsers: true,
        canManageSettings: true,
        canManageProjects: true,
        canManageBilling: true,
        canDeleteTenant: true,
      };
    case 'admin':
      return {
        canManageUsers: true,
        canManageSettings: false,
        canManageProjects: true,
        canManageBilling: false,
        canDeleteTenant: false,
      };
    case 'editor':
      return {
        canManageUsers: false,
        canManageSettings: false,
        canManageProjects: false,
        canManageBilling: false,
        canDeleteTenant: false,
      };
    case 'viewer':
    default:
      return {
        canManageUsers: false,
        canManageSettings: false,
        canManageProjects: false,
        canManageBilling: false,
        canDeleteTenant: false,
      };
  }
}
