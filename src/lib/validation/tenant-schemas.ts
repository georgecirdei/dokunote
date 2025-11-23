import { z } from 'zod';

/**
 * Zod validation schemas for tenant-related operations
 * Provides type-safe validation for API inputs and forms
 */

// Base tenant validation
export const tenantSchema = z.object({
  name: z.string()
    .min(2, 'Tenant name must be at least 2 characters')
    .max(100, 'Tenant name cannot exceed 100 characters')
    .trim(),
  
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Slug must start with a letter, contain only lowercase letters, numbers, and hyphens')
    .trim(),
  
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  
  website: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  
  subdomain: z.string()
    .min(2, 'Subdomain must be at least 2 characters')
    .max(50, 'Subdomain cannot exceed 50 characters')
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  
  customDomain: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/, 'Please enter a valid domain')
    .optional()
    .or(z.literal('')),
});

// Tenant creation schema
export const createTenantSchema = tenantSchema.omit({ slug: true });

// Tenant update schema (all fields optional except restrictions)
export const updateTenantSchema = tenantSchema.partial();

// Tenant settings schema
export const tenantSettingsSchema = z.object({
  allowPublicSignup: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(true),
  defaultUserRole: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
  enableAnalytics: z.boolean().default(true),
  enablePublicDocs: z.boolean().default(true),
  customCss: z.string().max(10000, 'Custom CSS cannot exceed 10,000 characters').optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color').optional(),
  logo: z.string().url('Please enter a valid URL').optional(),
});

// User-Tenant relationship schemas
export const userTenantSchema = z.object({
  role: z.enum(['owner', 'admin', 'editor', 'viewer']),
  permissions: z.record(z.boolean()).optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
});

// Project schemas
export const projectSchema = z.object({
  name: z.string()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name cannot exceed 100 characters')
    .trim(),
  
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Slug must start with a letter, contain only lowercase letters, numbers, and hyphens')
    .trim(),
  
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  
  isPublic: z.boolean().default(false),
  
  metaTitle: z.string()
    .max(60, 'Meta title cannot exceed 60 characters')
    .optional(),
  
  metaDescription: z.string()
    .max(160, 'Meta description cannot exceed 160 characters')
    .optional(),
  
  primaryColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color')
    .optional(),
  
  customCss: z.string()
    .max(10000, 'Custom CSS cannot exceed 10,000 characters')
    .optional(),
});

export const createProjectSchema = projectSchema.omit({ slug: true });
export const updateProjectSchema = projectSchema.partial();

// Type exports for TypeScript
export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenant = z.infer<typeof createTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;
export type UserTenant = z.infer<typeof userTenantSchema>;
export type InviteUser = z.infer<typeof inviteUserSchema>;
export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
