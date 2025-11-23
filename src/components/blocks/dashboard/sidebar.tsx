'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  BarChart3, 
  Settings, 
  Users, 
  PlusCircle, 
  FolderOpen,
  Search,
  CreditCard
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  currentTenant?: {
    id: string;
    name: string;
    plan: string;
    projectCount?: number;
    memberCount?: number;
  };
  userRole?: string;
}

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Dashboard overview and analytics',
  },
  {
    name: 'Projects',
    href: '/dashboard/projects',
    icon: FolderOpen,
    description: 'Manage your documentation projects',
  },
  {
    name: 'Search',
    href: '/dashboard/search',
    icon: Search,
    description: 'Search across all your content',
    badge: 'Soon',
  },
];

const teamNavigation = [
  {
    name: 'Team',
    href: '/dashboard/team',
    icon: Users,
    description: 'Manage team members and permissions',
    roles: ['owner', 'admin'],
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Organization and account settings',
  },
  {
    name: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
    description: 'Subscription and billing management',
    roles: ['owner'],
    badge: 'Soon',
  },
];

export function Sidebar({ currentTenant, userRole = 'viewer' }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const hasRole = (roles?: string[]) => {
    if (!roles) return true;
    return roles.includes(userRole);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tenant Context */}
      {currentTenant && (
        <div className="p-4">
          <div className="flex flex-col space-y-1">
            <h2 className="text-lg font-semibold truncate">
              {currentTenant.name}
            </h2>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {currentTenant.plan}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {userRole}
              </Badge>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">{currentTenant.projectCount || 0}</div>
              <div className="text-muted-foreground">Projects</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-medium">{currentTenant.memberCount || 0}</div>
              <div className="text-muted-foreground">Members</div>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Main Navigation */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Quick Actions */}
          <div>
            <Button className="w-full justify-start" asChild>
              <Link href="/dashboard/projects/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>

          {/* Primary Navigation */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Workspace
            </h3>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Team & Settings */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Organization
            </h3>
            <nav className="space-y-1">
              {teamNavigation.map((item) => {
                if (!hasRole(item.roles)) return null;
                
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <div>DokuNote v1.0.0</div>
          <div className="mt-1">
            <Link href="/help" className="hover:text-foreground">
              Help & Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="p-4">
        <div className="h-6 bg-muted rounded mb-2" />
        <div className="flex space-x-2">
          <div className="h-5 bg-muted rounded flex-1" />
          <div className="h-5 bg-muted rounded w-12" />
        </div>
      </div>
      <Separator />
      <div className="flex-1 p-4 space-y-4">
        <div className="h-10 bg-muted rounded" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
