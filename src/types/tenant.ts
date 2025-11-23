/**
 * TypeScript definitions for tenant-related types
 * Core types for multi-tenancy functionality
 */

export type TenantRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type TenantPlan = 'free' | 'pro' | 'enterprise';

export interface TenantSettings {
  allowPublicSignup: boolean;
  requireEmailVerification: boolean;
  defaultUserRole: TenantRole;
  enableAnalytics: boolean;
  enablePublicDocs: boolean;
  customCss?: string;
  primaryColor?: string;
  logo?: string;
}

export interface TenantPermissions {
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageProjects: boolean;
  canManageBilling: boolean;
  canDeleteTenant: boolean;
}

export interface TenantMember {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  permissions: Partial<TenantPermissions>;
  isActive: boolean;
  joinedAt: Date;
  user: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
}

export interface TenantInvitation {
  id: string;
  email: string;
  role: TenantRole;
  invitedBy: string;
  message?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}
