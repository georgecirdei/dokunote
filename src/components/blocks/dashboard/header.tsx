'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown, Building, Plus, PlusCircle, Users, Eye } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/common/logo';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { UserMenu } from '@/components/common/user-menu';
import { Sidebar } from './sidebar';

interface DashboardHeaderProps {
  user?: {
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
  availableTenants?: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    userRole: string;
  }>;
  userRole?: string;
  onTenantSwitch?: (tenantId: string) => void;
}

export function DashboardHeader({
  user,
  currentTenant,
  availableTenants = [],
  userRole = 'viewer',
  onTenantSwitch,
}: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>
                  Access your projects and workspace settings
                </SheetDescription>
              </SheetHeader>
              <Sidebar 
                currentTenant={currentTenant}
                userRole={userRole}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo (visible on mobile) */}
        <div className="md:hidden">
          <Logo showText={false} />
        </div>

        {/* Tenant Selector */}
        <div className="hidden md:flex items-center space-x-4">
          {currentTenant && availableTenants.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="justify-start h-auto p-2 max-w-[200px]">
                  <div className="flex items-center space-x-2 flex-1">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left flex-1 truncate">
                      <div className="font-medium truncate">{currentTenant.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {userRole}
                      </div>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTenants.map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => onTenantSwitch?.(tenant.id)}
                    className={cn(
                      'cursor-pointer',
                      tenant.id === currentTenant.id && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">{tenant.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {tenant.userRole}
                        </span>
                      </div>
                      {tenant.id === currentTenant.id && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/organizations/new" className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Organization
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : currentTenant ? (
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{currentTenant.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {userRole}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span className="text-sm">No organization selected</span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Action - New Project */}
          <Button size="sm" asChild>
            <Link href="/dashboard/projects/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Project</span>
            </Link>
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          {user && (
            <UserMenu 
              user={user}
              currentTenant={currentTenant ? {
                id: currentTenant.id,
                name: currentTenant.name,
                role: userRole,
              } : undefined}
            />
          )}
        </div>
      </div>
    </header>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="flex h-16 items-center px-4">
        <div className="md:hidden">
          <div className="w-8 h-8 bg-muted rounded animate-pulse mr-2" />
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <div className="w-48 h-10 bg-muted rounded animate-pulse" />
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center space-x-2">
          <div className="w-24 h-8 bg-muted rounded animate-pulse" />
          <div className="w-8 h-8 bg-muted rounded animate-pulse" />
          <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
        </div>
      </div>
    </header>
  );
}
