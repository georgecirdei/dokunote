import Link from 'next/link';
import { 
  FileText, 
  Users, 
  Eye, 
  TrendingUp,
  Calendar,
  Clock,
  Plus
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime, formatDate } from '@/lib/utils';

interface StatsCardsProps {
  stats?: {
    projectCount: number;
    documentCount: number;
    memberCount: number;
    recentActivity: number;
    generatedAt: Date;
  };
  recentProjects?: Array<{
    id: string;
    name: string;
    updatedAt: Date;
    isPublic: boolean;
  }>;
}

export function StatsCards({ stats, recentProjects = [] }: StatsCardsProps) {
  const cardData = [
    {
      title: 'Total Projects',
      value: stats?.projectCount || 0,
      description: 'Documentation projects',
      icon: FileText,
      trend: '+12% from last month',
      color: 'text-blue-600',
    },
    {
      title: 'Documents',
      value: stats?.documentCount || 0,
      description: 'Total pages created',
      icon: FileText,
      trend: '+5% from last week',
      color: 'text-green-600',
    },
    {
      title: 'Team Members',
      value: stats?.memberCount || 0,
      description: 'Active collaborators',
      icon: Users,
      trend: '+2 this month',
      color: 'text-purple-600',
    },
    {
      title: 'Recent Activity',
      value: stats?.recentActivity || 0,
      description: 'Events in last 7 days',
      icon: TrendingUp,
      trend: '+18% from last week',
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cardData.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
                <div className="text-xs text-green-600 mt-1">
                  {card.trend}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Projects */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Recent Projects</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="space-y-3">
                {recentProjects.slice(0, 3).map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatRelativeTime(project.updatedAt)}
                      </p>
                    </div>
                    <Badge variant={project.isPublic ? 'default' : 'secondary'} className="ml-2">
                      {project.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                ))}
                
                {recentProjects.length > 3 && (
                  <div className="pt-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <Link href="/dashboard/projects">
                        View all {recentProjects.length} projects
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No projects yet</p>
                <Button size="sm" className="mt-2" asChild>
                  <Link href="/dashboard/projects/new">
                    Create your first project
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link href="/dashboard/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Project
              </Link>
            </Button>
            
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/team">
                <Users className="mr-2 h-4 w-4" />
                Invite Team Members
              </Link>
            </Button>
            
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/analytics">
                <Eye className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>
                You have <strong>{stats.projectCount}</strong> project{stats.projectCount !== 1 ? 's' : ''} with{' '}
                <strong>{stats.documentCount}</strong> document{stats.documentCount !== 1 ? 's' : ''}.{' '}
                Your team has <strong>{stats.memberCount}</strong> active member{stats.memberCount !== 1 ? 's' : ''}.
              </p>
              <p className="mt-2 text-xs">
                Statistics updated {formatRelativeTime(stats.generatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
