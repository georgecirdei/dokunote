import { headers } from 'next/headers';
import { db, requireTenant } from './db';

/**
 * Enhanced multi-tenancy utilities with security middleware
 * Implements tenant isolation and subdomain support
 */

// Tenant resolution strategies
export type TenantResolutionMethod = 'subdomain' | 'session' | 'header';

export interface TenantContext {
  id: string;
  slug: string;
  subdomain?: string;
  name: string;
  resolutionMethod: TenantResolutionMethod;
}

/**
 * Resolve current tenant from request context
 * Supports subdomain-based and session-based resolution
 */
export async function resolveTenant(): Promise<TenantContext | null> {
  try {
    // Method 1: Subdomain-based resolution (for public docs)
    const headersList = headers();
    const host = headersList.get('host');
    const tenantSubdomain = headersList.get('x-tenant-subdomain'); // From Nginx
    
    if (tenantSubdomain && host?.includes('.dokunote.com')) {
      const tenant = await db.tenant.findUnique({
        where: { 
          subdomain: tenantSubdomain,
          isActive: true 
        },
        select: {
          id: true,
          slug: true,
          subdomain: true,
          name: true,
        }
      });
      
      if (tenant) {
        return {
          ...tenant,
          subdomain: tenant.subdomain || undefined,
          resolutionMethod: 'subdomain'
        };
      }
    }
    
    // Method 2: Header-based resolution (for API calls)
    const tenantId = headersList.get('x-tenant-id');
    if (tenantId) {
      const tenant = await db.tenant.findUnique({
        where: { 
          id: tenantId,
          isActive: true 
        },
        select: {
          id: true,
          slug: true,
          subdomain: true,
          name: true,
        }
      });
      
      if (tenant) {
        return {
          ...tenant,
          subdomain: tenant.subdomain || undefined,
          resolutionMethod: 'header'
        };
      }
    }
    
    // Method 3: Session-based resolution (for dashboard)
    // Will be implemented when NextAuth is set up
    return null;
    
  } catch (error) {
    console.error('Error resolving tenant:', error);
    return null;
  }
}

/**
 * Middleware function to enforce tenant authentication
 * Validates that user has access to the specified tenant
 */
export function withTenantAuth(handler: Function) {
  return async (req: Request) => {
    try {
      const tenantId = req.headers.get('x-tenant-id');
      const userId = req.headers.get('x-user-id'); // From auth middleware
      
      if (!tenantId || !userId) {
        return new Response('Tenant and user authentication required', { 
          status: 401 
        });
      }
      
      // Validate tenant access
      await requireTenant(tenantId, userId);
      
      // Proceed with the handler
      return handler(req);
      
    } catch (error) {
      console.error('Tenant auth error:', error);
      return new Response('Unauthorized tenant access', { 
        status: 403 
      });
    }
  };
}

/**
 * Get tenant-scoped database queries
 * Ensures all queries are properly scoped to prevent data leakage
 */
export class TenantScopedDB {
  constructor(private tenantId: string) {}
  
  // Project queries (tenant-scoped)
  get projects() {
    return {
      findMany: (args?: any) => db.project.findMany({
        ...args,
        where: {
          ...args?.where,
          tenantId: this.tenantId,
        },
      }),
      
      findUnique: (args: any) => db.project.findUnique({
        ...args,
        where: {
          ...args.where,
          tenantId: this.tenantId,
        },
      }),
      
      create: (args: any) => db.project.create({
        ...args,
        data: {
          ...args.data,
          tenantId: this.tenantId,
        },
      }),
      
      update: (args: any) => db.project.update({
        ...args,
        where: {
          ...args.where,
          tenantId: this.tenantId,
        },
      }),
      
      delete: (args: any) => db.project.delete({
        ...args,
        where: {
          ...args.where,
          tenantId: this.tenantId,
        },
      }),
    };
  }
  
  // Document queries (tenant-scoped)
  get documents() {
    return {
      findMany: (args?: any) => db.document.findMany({
        ...args,
        where: {
          ...args?.where,
          tenantId: this.tenantId,
        },
      }),
      
      findUnique: (args: any) => db.document.findUnique({
        ...args,
        where: {
          ...args.where,
          tenantId: this.tenantId,
        },
      }),
      
      create: (args: any) => db.document.create({
        ...args,
        data: {
          ...args.data,
          tenantId: this.tenantId,
        },
      }),
      
      update: (args: any) => db.document.update({
        ...args,
        where: {
          ...args.where,
          tenantId: this.tenantId,
        },
      }),
      
      delete: (args: any) => db.document.delete({
        ...args,
        where: {
          ...args.where,
          tenantId: this.tenantId,
        },
      }),
    };
  }
  
  // Analytics events (tenant-scoped)
  get events() {
    return {
      create: (args: any) => db.analyticsEvent.create({
        ...args,
        data: {
          ...args.data,
          tenantId: this.tenantId,
        },
      }),
      
      findMany: (args?: any) => db.analyticsEvent.findMany({
        ...args,
        where: {
          ...args?.where,
          tenantId: this.tenantId,
        },
      }),
    };
  }
}

/**
 * Create a tenant-scoped database client
 */
export function createTenantDB(tenantId: string) {
  return new TenantScopedDB(tenantId);
}

/**
 * Validate tenant slug format
 */
export function isValidTenantSlug(slug: string): boolean {
  // Only allow lowercase letters, numbers, and hyphens
  // Must start with a letter, end with letter or number
  const slugRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
  return slugRegex.test(slug) && slug.length >= 2 && slug.length <= 50;
}

/**
 * Generate a unique tenant slug from name
 */
export async function generateTenantSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
    
  let slug = baseSlug;
  let counter = 1;
  
  while (await db.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
