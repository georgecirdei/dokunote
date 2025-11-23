import { requireAuth } from '@/features/auth/helpers';

/**
 * Dashboard layout - requires authentication
 * Will be expanded in Phase 2.3 with full navigation
 */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure user is authenticated
  await requireAuth();

  return (
    <div className="min-h-screen">
      {/* TODO: Add dashboard header and sidebar in Phase 2.3 */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your DokuNote workspace
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
