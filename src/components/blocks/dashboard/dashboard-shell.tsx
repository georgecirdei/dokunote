'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardHeader } from './header';
import { Sidebar } from './sidebar';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
  };
  currentTenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    projectCount?: number;
    memberCount?: number;
  };
  availableTenants: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    userRole: string;
  }>;
  userRole: string;
}

/**
 * Dashboard shell component
 * Provides the main layout structure for the dashboard with responsive navigation
 */
export function DashboardShell({
  children,
  user,
  currentTenant,
  availableTenants,
  userRole,
}: DashboardShellProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { switchTenant } = useTenant();
  const { toast } = useToast();
  const router = useRouter();

  /**
   * Handle tenant switching
   */
  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.id) return;
    
    setIsLoading(true);
    
    try {
      await switchTenant(tenantId);
      
      toast({
        title: 'Organization switched',
        description: 'Successfully switched to the selected organization.',
      });
      
      // Refresh the page to update all server-side data
      router.refresh();
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      toast({
        title: 'Failed to switch organization',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader
        user={user}
        currentTenant={currentTenant}
        availableTenants={availableTenants}
        userRole={userRole}
        onTenantSwitch={handleTenantSwitch}
      />

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 border-r border-border bg-background/50">
          <Sidebar 
            currentTenant={currentTenant}
            userRole={userRole}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
              {!currentTenant && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                      No organization selected
                    </div>
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                    Please select or create an organization to start using DokuNote.
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-blue-600 dark:text-blue-400 text-sm">
                    Switching organization...
                  </div>
                </div>
              )}
              
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
