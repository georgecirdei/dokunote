/**
 * TypeScript definitions for documentation-related types
 * Core types for document management and publishing
 */

export interface DocumentMetadata {
  title: string;
  description?: string;
  author?: string;
  date?: string;
  tags?: string[];
  draft?: boolean;
  featured?: boolean;
}

export interface DocumentHierarchy {
  id: string;
  title: string;
  slug: string;
  parentId?: string;
  order: number;
  children?: DocumentHierarchy[];
  isPublished: boolean;
}

export interface DocumentVersion {
  id: string;
  version: number;
  title: string;
  content: string;
  changeNote?: string;
  authorId: string;
  createdAt: Date;
  author: {
    id: string;
    name?: string;
    email: string;
  };
}

export interface DocumentStats {
  totalViews: number;
  uniqueViews: number;
  averageReadTime: number;
  lastViewedAt?: Date;
  popularSearchTerms: string[];
  referralSources: Array<{
    source: string;
    count: number;
  }>;
}

export interface ProjectSettings {
  enableSearch: boolean;
  enableFeedback: boolean;
  showLastUpdated: boolean;
  enablePrintMode: boolean;
  enableDownload: boolean;
  customCss?: string;
  favicon?: string;
  logo?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  projectId: string;
  projectName: string;
  score: number;
  highlights: {
    title?: string;
    content?: string;
  };
  metadata?: {
    author?: string;
    lastModified: Date;
    tags?: string[];
  };
}

export interface SearchFilters {
  projectIds?: string[];
  authorIds?: string[];
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  isPublished?: boolean;
}

export interface BreadcrumbItem {
  title: string;
  slug?: string;
  href: string;
}

export interface NavigationItem {
  title: string;
  slug: string;
  href: string;
  order: number;
  children?: NavigationItem[];
  isActive?: boolean;
  isExpanded?: boolean;
}

export type DocumentEvent = 
  | 'view'
  | 'search'
  | 'download'
  | 'share'
  | 'print'
  | 'feedback'
  | 'edit'
  | 'publish'
  | 'unpublish';

export interface DocumentEventData {
  type: DocumentEvent;
  documentId: string;
  projectId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}
