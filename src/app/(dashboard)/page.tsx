import type { Metadata } from 'next';
import { getCurrentUser, getCurrentTenant } from '@/features/auth/helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Dashboard - DokuNote',
  description: 'Your DokuNote workspace dashboard',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const tenant = await getCurrentTenant();

  if (!user) {
    return (
      <div className="text-center">
        <p>User not found. Please sign in again.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Welcome back, {user.name || 'User'}!</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tenant Context */}
      {tenant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current Organization
              <Badge variant="outline" className="capitalize">
                {tenant.userTenants[0]?.role || 'Member'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h3 className="font-semibold">{tenant.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {tenant.subdomain && `${tenant.subdomain}.dokunote.com`}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Projects:</span>
                  <span className="ml-2 font-medium">{tenant._count?.projects || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Team Members:</span>
                  <span className="ml-2 font-medium">{tenant._count?.userTenants || 0}</span>
                </div>
              </div>

              {tenant.projects && tenant.projects.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recent Projects</h4>
                  <div className="grid gap-2">
                    {tenant.projects.slice(0, 3).map((project) => (
                      <div 
                        key={project.id}
                        className="flex items-center justify-between p-2 border border-border rounded"
                      >
                        <span className="text-sm">{project.name}</span>
                        <Badge variant={project.isPublic ? 'default' : 'secondary'}>
                          {project.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Project</CardTitle>
            <CardDescription>
              Start a new documentation project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Projects help organize your documentation and can be published publicly.
            </p>
            <div className="text-sm text-muted-foreground">
              Coming soon in Phase 3.1
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Write Documentation</CardTitle>
            <CardDescription>
              Create and edit your docs with our MDX editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Rich markdown editor with live preview and syntax highlighting.
            </p>
            <div className="text-sm text-muted-foreground">
              Coming soon in Phase 3.2
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">View Analytics</CardTitle>
            <CardDescription>
              Track your documentation performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              See page views, popular content, and user engagement metrics.
            </p>
            <div className="text-sm text-muted-foreground">
              Coming soon in Phase 4.2
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
