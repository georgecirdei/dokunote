import { requireAuth, getCurrentUser, getCurrentTenant, getUserTenants } from '@/features/auth/helpers';
import { DashboardShell } from '@/components/blocks/dashboard/dashboard-shell';

/**
 * Dashboard layout with full navigation and tenant context
 * Requires authentication and provides complete dashboard experience
 */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure user is authenticated and get context
  const session = await requireAuth();
  const user = await getCurrentUser();
  const currentTenant = await getCurrentTenant();
  const availableTenants = await getUserTenants();

  if (!user) {
    throw new Error('User not found');
  }

  // Get user role in current tenant
  const userRole = currentTenant?.userTenants?.[0]?.role || 'viewer';

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }}
      currentTenant={currentTenant ? {
        id: currentTenant.id,
        name: currentTenant.name,
        slug: currentTenant.slug,
        plan: currentTenant.plan,
        projectCount: currentTenant._count?.projects,
        memberCount: currentTenant._count?.userTenants,
      } : undefined}
      availableTenants={availableTenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        userRole: tenant.userRole,
      }))}
      userRole={userRole}
    >
      {children}
    </DashboardShell>
  );
}
