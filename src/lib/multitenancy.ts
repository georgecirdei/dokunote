import { headers } from 'next/headers';
import { db, requireTenant } from './db';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { ContextLogger } from './logger';

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
 * Resolve current tenant from request context with authentication integration
 * Supports subdomain-based, session-based, and header-based resolution
 */
export async function resolveTenant(req?: Request): Promise<TenantContext | null> {
  const logger = new ContextLogger({ requestId: 'tenant-resolution' });

  try {
    // Method 1: Subdomain-based resolution (for public docs)
    const headersList = req ? 
      new Headers(req.headers) : 
      await headers();
    
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
        logger.info('Tenant resolved via subdomain', {
          tenantId: tenant.id,
          subdomain: tenantSubdomain,
        });
        
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
        logger.info('Tenant resolved via header', {
          tenantId: tenant.id,
        });
        
        return {
          ...tenant,
          subdomain: tenant.subdomain || undefined,
          resolutionMethod: 'header'
        };
      }
    }
    
    // Method 3: Session-based resolution (for dashboard)
    const session = await getServerSession(authOptions);
    if (session?.user?.currentTenantId) {
      const tenant = await db.tenant.findUnique({
        where: { 
          id: session.user.currentTenantId,
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
        logger.info('Tenant resolved via session', {
          tenantId: tenant.id,
          userId: session.user.id,
        });
        
        return {
          ...tenant,
          subdomain: tenant.subdomain || undefined,
          resolutionMethod: 'session'
        };
      }
    }
    
    return null;
    
  } catch (error) {
    logger.error('Error resolving tenant', error);
    return null;
  }
}

/**
 * Enhanced middleware function to enforce tenant authentication
 * Validates that authenticated user has access to the specified tenant
 */
export function withTenantAuth(handler: Function) {
  return async (req: Request) => {
    const logger = new ContextLogger({ 
      requestId: crypto.randomUUID(),
      method: req.method,
      url: req.url,
    });

    try {
      // Get session from NextAuth
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) {
        logger.warn('Tenant auth failed - no session');
        return new Response(
          JSON.stringify({ error: 'Authentication required' }), 
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Get tenant ID from various sources
      const tenantId = req.headers.get('x-tenant-id') || 
                      session.user.currentTenantId;
      
      if (!tenantId) {
        logger.warn('Tenant auth failed - no tenant context', {
          userId: session.user.id,
        });
        return new Response(
          JSON.stringify({ error: 'Tenant context required' }), 
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Validate tenant access using enhanced requireTenant
      await requireTenant(tenantId, session.user.id);
      
      logger.info('Tenant auth successful', {
        userId: session.user.id,
        tenantId,
      });
      
      // Add tenant and user context to request headers for downstream handlers
      const enhancedReq = new Request(req, {
        headers: {
          ...Object.fromEntries(req.headers.entries()),
          'x-tenant-id': tenantId,
          'x-user-id': session.user.id,
          'x-user-role': session.user.currentTenantRole || 'viewer',
        },
      });
      
      // Proceed with the handler
      return handler(enhancedReq);
      
    } catch (error) {
      logger.error('Tenant authentication failed', error, {
        userId: (await getServerSession(authOptions))?.user?.id,
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized tenant access',
          message: error instanceof Error ? error.message : 'Access denied'
        }), 
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}

/**
 * Enhanced tenant-scoped database queries with security validation
 * Ensures all queries are properly scoped to prevent data leakage
 */
export class TenantScopedDB {
  private logger: ContextLogger;
  
  constructor(
    private tenantId: string, 
    private userId?: string,
    private userRole?: string
  ) {
    if (!tenantId) {
      throw new Error('TenantId is required for tenant-scoped operations');
    }
    
    this.logger = new ContextLogger({ 
      requestId: crypto.randomUUID(),
      tenantId,
      userId,
    });
  }
  
  // Project queries (tenant-scoped with enhanced security)
  get projects() {
    return {
      findMany: async (args?: any) => {
        this.logger.debug('Project findMany query', { 
          operation: 'findMany',
          hasWhere: !!args?.where 
        });
        
        return db.project.findMany({
          ...args,
          where: {
            ...args?.where,
            tenantId: this.tenantId,
            isActive: true, // Only active projects
          },
        });
      },
      
      findUnique: async (args: any) => {
        this.logger.debug('Project findUnique query', { 
          operation: 'findUnique',
          projectId: args?.where?.id 
        });
        
        const result = await db.project.findUnique({
          ...args,
          where: {
            ...args.where,
            tenantId: this.tenantId,
          },
        });
        
        if (!result) {
          this.logger.warn('Project not found or access denied', {
            projectId: args?.where?.id,
          });
        }
        
        return result;
      },
      
      create: async (args: any) => {
        this.logger.info('Creating new project', {
          operation: 'create',
          projectName: args?.data?.name,
        });
        
        return db.project.create({
          ...args,
          data: {
            ...args.data,
            tenantId: this.tenantId,
          },
        });
      },
      
      update: async (args: any) => {
        this.logger.info('Updating project', {
          operation: 'update',
          projectId: args?.where?.id,
        });
        
        return db.project.update({
          ...args,
          where: {
            ...args.where,
            tenantId: this.tenantId,
          },
        });
      },
      
      delete: async (args: any) => {
        this.logger.warn('Deleting project', {
          operation: 'delete',
          projectId: args?.where?.id,
        });
        
        return db.project.delete({
          ...args,
          where: {
            ...args.where,
            tenantId: this.tenantId,
          },
        });
      },
    };
  }
  
  // Document queries (tenant-scoped with enhanced security)
  get documents() {
    return {
      findMany: async (args?: any) => {
        this.logger.debug('Document findMany query', { 
          operation: 'findMany',
          projectId: args?.where?.projectId 
        });
        
        return db.document.findMany({
          ...args,
          where: {
            ...args?.where,
            tenantId: this.tenantId,
          },
        });
      },
      
      findUnique: async (args: any) => {
        this.logger.debug('Document findUnique query', { 
          operation: 'findUnique',
          documentId: args?.where?.id 
        });
        
        const result = await db.document.findUnique({
          ...args,
          where: {
            ...args.where,
            tenantId: this.tenantId,
          },
        });
        
        if (!result) {
          this.logger.warn('Document not found or access denied', {
            documentId: args?.where?.id,
          });
        }
        
        return result;
      },
      
      create: async (args: any) => {
        this.logger.info('Creating new document', {
          operation: 'create',
          documentTitle: args?.data?.title,
          projectId: args?.data?.projectId,
          authorId: args?.data?.authorId,
        });
        
        return db.document.create({
          ...args,
          data: {
            ...args.data,
            tenantId: this.tenantId,
            authorId: this.userId || args.data.authorId,
          },
        });
      },
      
      update: async (args: any) => {
        this.logger.info('Updating document', {
          operation: 'update',
          documentId: args?.where?.id,
        });
        
        return db.document.update({
          ...args,
          where: {
            ...args.where,
            tenantId: this.tenantId,
          },
        });
      },
      
      delete: async (args: any) => {
        this.logger.warn('Deleting document', {
          operation: 'delete',
          documentId: args?.where?.id,
        });
        
        return db.document.delete({
          ...args,
          where: {
            ...args.where,
            tenantId: this.tenantId,
          },
        });
      },
    };
  }
  
  // Analytics events (tenant-scoped with enhanced security)
  get events() {
    return {
      create: async (args: any) => {
        this.logger.debug('Creating analytics event', {
          operation: 'create',
          eventType: args?.data?.type,
        });
        
        return db.analyticsEvent.create({
          ...args,
          data: {
            ...args.data,
            tenantId: this.tenantId,
            userId: this.userId || args.data.userId,
          },
        });
      },
      
      findMany: async (args?: any) => {
        this.logger.debug('Analytics events findMany query', {
          operation: 'findMany',
          eventType: args?.where?.type,
        });
        
        return db.analyticsEvent.findMany({
          ...args,
          where: {
            ...args?.where,
            tenantId: this.tenantId,
          },
        });
      },
    };
  }

  // Permission validation methods
  async validateProjectAccess(projectId: string): Promise<boolean> {
    const project = await db.project.findUnique({
      where: { 
        id: projectId,
        tenantId: this.tenantId,
      },
      select: { id: true },
    });
    
    const hasAccess = !!project;
    
    if (!hasAccess) {
      this.logger.warn('Project access validation failed', {
        projectId,
        operation: 'validateProjectAccess',
      });
    }
    
    return hasAccess;
  }

  async validateDocumentAccess(documentId: string): Promise<boolean> {
    const document = await db.document.findUnique({
      where: { 
        id: documentId,
        tenantId: this.tenantId,
      },
      select: { id: true, projectId: true },
    });
    
    const hasAccess = !!document;
    
    if (!hasAccess) {
      this.logger.warn('Document access validation failed', {
        documentId,
        operation: 'validateDocumentAccess',
      });
    }
    
    return hasAccess;
  }

  // User management within tenant
  async getTenantMembers() {
    this.logger.debug('Fetching tenant members');
    
    return db.userTenant.findMany({
      where: {
        tenantId: this.tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // Tenant statistics
  async getTenantStats() {
    this.logger.debug('Fetching tenant statistics');
    
    const [projectCount, documentCount, memberCount, recentActivity] = await Promise.all([
      db.project.count({
        where: { 
          tenantId: this.tenantId,
          isActive: true,
        },
      }),
      
      db.document.count({
        where: { tenantId: this.tenantId },
      }),
      
      db.userTenant.count({
        where: { 
          tenantId: this.tenantId,
          isActive: true,
        },
      }),
      
      db.analyticsEvent.count({
        where: {
          tenantId: this.tenantId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);
    
    return {
      projectCount,
      documentCount,
      memberCount,
      recentActivity,
      generatedAt: new Date(),
    };
  }
}

/**
 * Create a tenant-scoped database client with user context
 */
export function createTenantDB(
  tenantId: string, 
  userId?: string, 
  userRole?: string
) {
  return new TenantScopedDB(tenantId, userId, userRole);
}

/**
 * Create tenant-scoped DB from session
 */
export async function createTenantDBFromSession() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.currentTenantId) {
    throw new Error('No tenant context in session');
  }
  
  return createTenantDB(
    session.user.currentTenantId,
    session.user.id,
    session.user.currentTenantRole
  );
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
