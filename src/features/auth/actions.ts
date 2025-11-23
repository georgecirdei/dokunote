import { hash, compare } from 'bcryptjs';
import { z } from 'zod';

import { db } from '@/lib/db';
import { ContextLogger, logAuthEvent } from '@/lib/logger';
import { generateTenantSlug, isValidTenantSlug } from '@/lib/multitenancy';
import { getCurrentSession, requireAuth } from '@/lib/auth';

/**
 * Authentication server actions
 * Handles user registration, password management, and profile operations
 */

const authLogger = new ContextLogger({ requestId: 'auth-actions' });

// Validation schemas
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  tenantName: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name cannot exceed 100 characters')
    .trim()
    .optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
});

const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional(),
  bio: z.string()
    .max(500, 'Bio cannot exceed 500 characters')
    .trim()
    .optional(),
  website: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  location: z.string()
    .max(100, 'Location cannot exceed 100 characters')
    .trim()
    .optional(),
});

export interface RegisterResult {
  success: boolean;
  message: string;
  userId?: string;
  tenantId?: string;
}

export interface AuthActionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Register new user with optional tenant creation
 */
export async function registerUser(formData: FormData): Promise<RegisterResult> {
  try {
    const rawData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      tenantName: formData.get('tenantName') as string || undefined,
    };

    // Validate input
    const validatedData = registerSchema.parse(rawData);

    authLogger.info('User registration attempt', {
      email: validatedData.email,
      hasTenantName: !!validatedData.tenantName,
    });

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      authLogger.warn('Registration attempt with existing email');
      return {
        success: false,
        message: 'A user with this email address already exists',
      };
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
      },
    });

    authLogger.info('User created successfully', {
      userId: user.id,
      email: user.email,
    });

    // Create tenant if specified, otherwise create personal tenant
    const tenantName = validatedData.tenantName || `${validatedData.name}'s Workspace`;
    const tenantSlug = await generateTenantSlug(tenantName);

    const tenant = await db.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        subdomain: tenantSlug,
        description: validatedData.tenantName 
          ? `${validatedData.tenantName} documentation workspace`
          : 'Personal workspace',
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

    // Add user as owner of the tenant
    await db.userTenant.create({
      data: {
        userId: user.id,
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

    logAuthEvent('register', user.id, true, {
      requestId: crypto.randomUUID(),
    });

    authLogger.info('User registration completed successfully', {
      userId: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    return {
      success: true,
      message: 'Account created successfully! Please sign in.',
      userId: user.id,
      tenantId: tenant.id,
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      authLogger.warn('Registration validation error');
      return {
        success: false,
        message: firstError.message,
      };
    }

    authLogger.error('User registration failed', error);
    return {
      success: false,
      message: 'Registration failed. Please try again.',
    };
  }
}

/**
 * Update user password
 */
export async function updatePassword(formData: FormData): Promise<AuthActionResult> {
  try {
    const session = await requireAuth();
    
    const rawData = {
      currentPassword: formData.get('currentPassword') as string,
      newPassword: formData.get('newPassword') as string,
    };

    const validatedData = updatePasswordSchema.parse(rawData);

    // Get user with password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, password: true },
    });

    if (!user || !user.password) {
      authLogger.warn('Password update attempt for user without password', {
        userId: session.user.id,
      });
      return {
        success: false,
        message: 'Unable to update password. Please contact support.',
      };
    }

    // Verify current password
    const isValidPassword = await compare(validatedData.currentPassword, user.password);
    
    if (!isValidPassword) {
      authLogger.warn('Password update with invalid current password', {
        userId: user.id,
      });
      return {
        success: false,
        message: 'Current password is incorrect',
      };
    }

    // Hash new password
    const hashedPassword = await hash(validatedData.newPassword, 12);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    logAuthEvent('password_reset', user.id, true, {
      requestId: crypto.randomUUID(),
    });

    authLogger.info('Password updated successfully', {
      userId: user.id,
    });

    return {
      success: true,
      message: 'Password updated successfully',
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.issues[0].message,
      };
    }

    authLogger.error('Password update failed', error);
    return {
      success: false,
      message: 'Failed to update password. Please try again.',
    };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(formData: FormData): Promise<AuthActionResult> {
  try {
    const session = await requireAuth();
    
    const rawData = {
      name: formData.get('name') as string || undefined,
      bio: formData.get('bio') as string || undefined,
      website: formData.get('website') as string || undefined,
      location: formData.get('location') as string || undefined,
    };

    const validatedData = updateProfileSchema.parse(rawData);

    // Update user profile
    await db.user.update({
      where: { id: session.user.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    });

    authLogger.info('Profile updated successfully', {
      userId: session.user.id,
      updatedFields: Object.keys(validatedData).filter(key => 
        validatedData[key as keyof typeof validatedData] !== undefined
      ),
    });

    return {
      success: true,
      message: 'Profile updated successfully',
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.issues[0].message,
      };
    }

    authLogger.error('Profile update failed', error, {
      userId: (await getCurrentSession())?.user?.id,
    });

    return {
      success: false,
      message: 'Failed to update profile. Please try again.',
    };
  }
}

/**
 * Delete user account
 */
export async function deleteAccount(): Promise<AuthActionResult> {
  try {
    const session = await requireAuth();

    // Get user tenants where user is the only owner
    const userTenants = await db.userTenant.findMany({
      where: {
        userId: session.user.id,
        role: 'owner',
        isActive: true,
      },
      include: {
        tenant: {
          include: {
            userTenants: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Check for tenants that would be orphaned
    const orphanedTenants = userTenants.filter(
      ut => ut.tenant.userTenants.filter(member => member.role === 'owner').length === 1
    );

    if (orphanedTenants.length > 0) {
      authLogger.warn('Account deletion blocked - would orphan tenants', {
        userId: session.user.id,
        orphanedTenantIds: orphanedTenants.map(ut => ut.tenant.id),
      });

      return {
        success: false,
        message: 'Cannot delete account. Please transfer ownership of your organizations or delete them first.',
      };
    }

    // Delete user (cascade will handle related records)
    await db.user.delete({
      where: { id: session.user.id },
    });

    logAuthEvent('delete_account', session.user.id, true, {
      requestId: crypto.randomUUID(),
    });

    authLogger.info('User account deleted', {
      userId: session.user.id,
      email: session.user.email,
    });

    return {
      success: true,
      message: 'Account deleted successfully',
    };

  } catch (error) {
    authLogger.error('Account deletion failed', error);
    return {
      success: false,
      message: 'Failed to delete account. Please try again.',
    };
  }
}
