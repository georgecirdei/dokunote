import type { Metadata } from 'next';
import { requireAuth, getCurrentTenant } from '@/features/auth/helpers';
import { createTenantDBFromSession } from '@/lib/multitenancy';
import { StatsCards } from '@/components/blocks/dashboard/stats-cards';

export const metadata: Metadata = {
  title: 'Dashboard - DokuNote',
  description: 'Your DokuNote workspace dashboard',
};

export default async function DashboardPage() {
  // Authentication and tenant context handled by layout
  const currentTenant = await getCurrentTenant();
  
  // Get tenant statistics if we have a tenant
  let stats = null;
  let recentProjects: Array<{
    id: string;
    name: string;
    updatedAt: Date;
    isPublic: boolean;
  }> = [];
  
  if (currentTenant) {
    try {
      const tenantDB = await createTenantDBFromSession();
      
      // Get tenant statistics
      stats = await tenantDB.getTenantStats();
      
      // Get recent projects
      recentProjects = await tenantDB.projects.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          updatedAt: true,
          isPublic: true,
        },
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {currentTenant 
              ? `Manage your ${currentTenant.name} workspace` 
              : 'Welcome to your DokuNote workspace'
            }
          </p>
        </div>
      </div>

      {/* Stats and Activity */}
      {currentTenant ? (
        <StatsCards 
          stats={stats || undefined}
          recentProjects={recentProjects}
        />
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-2">Get Started</h2>
            <p className="text-muted-foreground mb-6">
              You need to select or create an organization to start using DokuNote.
            </p>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                • Create a new organization for your team
              </div>
              <div className="text-sm text-muted-foreground">
                • Join an existing organization
              </div>
              <div className="text-sm text-muted-foreground">
                • Switch between multiple organizations
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
