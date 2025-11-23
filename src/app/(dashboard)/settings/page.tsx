import type { Metadata } from 'next';
import { getCurrentTenant, requireTenantAccess } from '@/features/auth/helpers';
import { getTenantMembers } from '@/features/tenants/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getInitials, formatRelativeTime } from '@/lib/utils';
import { Building, Users, Settings, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Organization Settings - DokuNote',
  description: 'Manage your organization settings and team members',
};

export default async function SettingsPage() {
  const currentTenant = await getCurrentTenant();
  const members = await getTenantMembers();

  if (!currentTenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Please select an organization to manage settings.
        </p>
      </div>
    );
  }

  const userRole = currentTenant.userTenants[0]?.role || 'viewer';
  const canManageSettings = userRole === 'owner' || 
    (currentTenant.userTenants[0]?.permissions as any)?.canManageSettings;
  const canManageUsers = userRole === 'owner' || 
    (currentTenant.userTenants[0]?.permissions as any)?.canManageUsers;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage {currentTenant.name} settings and team members
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing" disabled>Billing</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Organization Information</span>
              </CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentTenant.name}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Subdomain</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentTenant.subdomain}.dokunote.com
                  </p>
                </div>
                
                {currentTenant.description && (
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentTenant.description}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Plan</label>
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {currentTenant.plan}
                  </Badge>
                </div>
              </div>

              {canManageSettings && (
                <div className="pt-4 border-t">
                  <Button size="sm">
                    Edit Organization
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Public Documentation</span>
              </CardTitle>
              <CardDescription>
                Configure how your documentation appears publicly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Public URL</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your documentation is available at:{' '}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {currentTenant.subdomain}.dokunote.com
                    </code>
                  </p>
                </div>

                {canManageSettings && (
                  <div className="text-sm text-muted-foreground">
                    Custom domain support coming in Phase 5.2
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Members */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Members</span>
                  <Badge variant="secondary">{members.length}</Badge>
                </div>
                {canManageUsers && (
                  <Button size="sm">
                    Invite Member
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Manage your team members and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={member.user.image || undefined} />
                        <AvatarFallback>
                          {getInitials(member.user.name || member.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">
                            {member.user.name || member.user.email}
                          </p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatRelativeTime(member.joinedAt)}
                        </p>
                      </div>
                    </div>
                    
                    {canManageUsers && member.role !== 'owner' && (
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          Edit Role
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No team members yet</p>
                    {canManageUsers && (
                      <Button size="sm" className="mt-2">
                        Invite your first team member
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Advanced Settings</span>
              </CardTitle>
              <CardDescription>
                Advanced configuration and danger zone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These actions cannot be undone. Please be careful.
                </p>
                
                {userRole === 'owner' && (
                  <Button variant="destructive" size="sm">
                    Delete Organization
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
