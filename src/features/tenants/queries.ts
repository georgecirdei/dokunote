import { db } from '@/lib/db';
import { requireAuth, requireTenantAccessForAPI } from '@/features/auth/helpers';
import { createTenantDBFromSession } from '@/lib/multitenancy';

/**
 * Tenant management queries
 * Provides data fetching for tenant dashboard and management interfaces
 */

/**
 * Get detailed tenant information for dashboard
 */
export async function getTenantDetails(tenantId?: string) {
  try {
    const session = await requireAuth();
    const targetTenantId = tenantId || session.user.currentTenantId;
    
    if (!targetTenantId) {
      return null;
    }

    // Ensure user has access to tenant
    try {
      await requireTenantAccessForAPI(targetTenantId);
    } catch (error) {
      // Convert to a simple access check for queries
      const hasAccess = await db.userTenant.findUnique({
        where: {
          userId_tenantId: { 
            userId: session.user.id, 
            tenantId: targetTenantId 
          },
          isActive: true,
        },
      });
      
      if (!hasAccess) {
        throw new Error('Unauthorized tenant access');
      }
    }

    const tenant = await db.tenant.findUnique({
      where: { 
        id: targetTenantId,
        isActive: true,
      },
      include: {
        userTenants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                lastLoginAt: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        projects: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            isPublic: true,
            updatedAt: true,
            _count: {
              select: {
                documents: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            projects: { where: { isActive: true } },
            userTenants: { where: { isActive: true } },
          },
        },
      },
    });

    if (!tenant) {
      return null;
    }

    // Get recent activity
    const recentActivity = await db.analyticsEvent.findMany({
      where: {
        tenantId: targetTenantId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        type: true,
        createdAt: true,
        data: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ...tenant,
      recentActivity,
    };

  } catch (error) {
    console.error('Failed to fetch tenant details:', error);
    return null;
  }
}

/**
 * Get tenant statistics for dashboard
 */
export async function getTenantStats(tenantId?: string) {
  try {
    const tenantDB = await createTenantDBFromSession();
    return await tenantDB.getTenantStats();
  } catch (error) {
    console.error('Failed to fetch tenant stats:', error);
    return {
      projectCount: 0,
      documentCount: 0,
      memberCount: 0,
      recentActivity: 0,
      generatedAt: new Date(),
    };
  }
}

/**
 * Get tenant members with roles and permissions
 */
export async function getTenantMembers(tenantId?: string) {
  try {
    const session = await requireAuth();
    const targetTenantId = tenantId || session.user.currentTenantId;
    
    if (!targetTenantId) {
      return [];
    }

    // Validate access
    const hasAccess = await db.userTenant.findUnique({
      where: {
        userId_tenantId: { 
          userId: session.user.id, 
          tenantId: targetTenantId 
        },
        isActive: true,
      },
    });
    
    if (!hasAccess) {
      throw new Error('Unauthorized tenant access');
    }

    const members = await db.userTenant.findMany({
      where: {
        tenantId: targetTenantId,
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
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // Owners first
        { joinedAt: 'asc' },
      ],
    });

    return members.map(member => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      permissions: member.permissions,
      joinedAt: member.joinedAt,
      isActive: member.isActive,
      user: member.user,
    }));

  } catch (error) {
    console.error('Failed to fetch tenant members:', error);
    return [];
  }
}

/**
 * Get tenant activity feed
 */
export async function getTenantActivity(
  tenantId?: string,
  limit: number = 20
) {
  try {
    const session = await requireAuth();
    const targetTenantId = tenantId || session.user.currentTenantId;
    
    if (!targetTenantId) {
      return [];
    }

    // Validate access
    const hasAccess = await db.userTenant.findUnique({
      where: {
        userId_tenantId: { 
          userId: session.user.id, 
          tenantId: targetTenantId 
        },
        isActive: true,
      },
    });
    
    if (!hasAccess) {
      throw new Error('Unauthorized tenant access');
    }

    const activity = await db.analyticsEvent.findMany({
      where: {
        tenantId: targetTenantId,
        type: {
          in: ['document_created', 'document_updated', 'project_created', 'user_joined'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        type: true,
        createdAt: true,
        data: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        document: {
          select: {
            title: true,
            slug: true,
          },
        },
        project: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    return activity;

  } catch (error) {
    console.error('Failed to fetch tenant activity:', error);
    return [];
  }
}

/**
 * Search across tenant content
 */
export async function searchTenantContent(
  query: string,
  tenantId?: string,
  limit: number = 50
) {
  try {
    const session = await requireAuth();
    const targetTenantId = tenantId || session.user.currentTenantId;
    
    if (!targetTenantId) {
      return [];
    }

    // Validate access
    const hasAccess = await db.userTenant.findUnique({
      where: {
        userId_tenantId: { 
          userId: session.user.id, 
          tenantId: targetTenantId 
        },
        isActive: true,
      },
    });
    
    if (!hasAccess) {
      throw new Error('Unauthorized tenant access');
    }

    // Simple text search across documents and projects
    // TODO: Implement full-text search in Phase 4.1
    const [documents, projects] = await Promise.all([
      db.document.findMany({
        where: {
          tenantId: targetTenantId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          updatedAt: true,
          project: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        take: Math.floor(limit * 0.8), // 80% for documents
        orderBy: { updatedAt: 'desc' },
      }),

      db.project.findMany({
        where: {
          tenantId: targetTenantId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          updatedAt: true,
          isPublic: true,
        },
        take: Math.floor(limit * 0.2), // 20% for projects
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Combine and format results
    const results = [
      ...documents.map(doc => ({
        type: 'document' as const,
        id: doc.id,
        title: doc.title,
        description: doc.excerpt || 'No description',
        url: `/dashboard/projects/${doc.project.slug}/docs/${doc.slug}`,
        updatedAt: doc.updatedAt,
        metadata: {
          projectName: doc.project.name,
        },
      })),
      ...projects.map(project => ({
        type: 'project' as const,
        id: project.id,
        title: project.name,
        description: project.description || 'No description',
        url: `/dashboard/projects/${project.slug}`,
        updatedAt: project.updatedAt,
        metadata: {
          isPublic: project.isPublic,
        },
      })),
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return results;

  } catch (error) {
    console.error('Failed to search tenant content:', error);
    return [];
  }
}
