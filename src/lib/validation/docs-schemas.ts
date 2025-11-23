import { z } from 'zod';

/**
 * Zod validation schemas for document-related operations
 * Provides type-safe validation for MDX documents, versions, and content
 */

// Base document validation
export const documentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  
  content: z.string()
    .min(1, 'Content is required')
    .max(1000000, 'Content cannot exceed 1MB'), // 1MB limit for MDX content
  
  excerpt: z.string()
    .max(500, 'Excerpt cannot exceed 500 characters')
    .optional(),
  
  parentId: z.string().cuid().optional(),
  
  order: z.number()
    .int('Order must be an integer')
    .min(0, 'Order cannot be negative')
    .default(0),
  
  isPublished: z.boolean().default(false),
  isDraft: z.boolean().default(true),
  
  // SEO fields
  metaTitle: z.string()
    .max(60, 'Meta title cannot exceed 60 characters')
    .optional(),
  
  metaDescription: z.string()
    .max(160, 'Meta description cannot exceed 160 characters')
    .optional(),
  
  keywords: z.array(z.string().trim())
    .max(10, 'Cannot have more than 10 keywords')
    .optional()
    .default([]),
});

// Document creation schema (excludes generated fields)
export const createDocumentSchema = documentSchema.omit({ 
  slug: true, // Generated from title
  order: true, // Auto-calculated
});

// Document update schema (all fields optional except restrictions)
export const updateDocumentSchema = documentSchema.partial();

// Document publishing schema
export const publishDocumentSchema = z.object({
  isPublished: z.boolean(),
  publishedAt: z.date().optional(),
});

// Document reordering schema
export const reorderDocumentsSchema = z.object({
  documents: z.array(z.object({
    id: z.string().cuid(),
    order: z.number().int().min(0),
  })),
});

// Document version schema
export const documentVersionSchema = z.object({
  version: z.number().int().positive(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(1000000),
  changeNote: z.string()
    .max(500, 'Change note cannot exceed 500 characters')
    .optional(),
});

// MDX content validation
export const mdxContentSchema = z.object({
  content: z.string().min(1, 'MDX content is required'),
  
  // Validate common MDX frontmatter
  frontmatter: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
  }).optional(),
});

// Search query schema
export const searchDocumentsSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query cannot exceed 100 characters')
    .trim(),
  
  projectId: z.string().cuid().optional(),
  
  filters: z.object({
    isPublished: z.boolean().optional(),
    authorId: z.string().cuid().optional(),
    parentId: z.string().cuid().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }).optional(),
  
  sort: z.object({
    field: z.enum(['title', 'createdAt', 'updatedAt', 'publishedAt']).default('createdAt'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }).optional(),
});

// Bulk operations schema
export const bulkDocumentOperationSchema = z.object({
  documentIds: z.array(z.string().cuid())
    .min(1, 'At least one document must be selected')
    .max(50, 'Cannot operate on more than 50 documents at once'),
  
  operation: z.enum(['publish', 'unpublish', 'delete', 'move']),
  
  // For move operation
  targetParentId: z.string().cuid().optional(),
  targetProjectId: z.string().cuid().optional(),
});

// Document analytics schema
export const documentAnalyticsSchema = z.object({
  documentId: z.string().cuid(),
  eventType: z.enum(['view', 'search', 'download', 'share']),
  
  metadata: z.object({
    searchQuery: z.string().optional(), // For search events
    referrer: z.string().url().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().ip().optional(),
    country: z.string().optional(),
    device: z.enum(['desktop', 'tablet', 'mobile']).optional(),
    browser: z.string().optional(),
  }).optional(),
});

// Document import/export schemas
export const importDocumentsSchema = z.object({
  format: z.enum(['markdown', 'mdx', 'json']),
  content: z.string().min(1, 'Import content is required'),
  options: z.object({
    preserveIds: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
    createMissingParents: z.boolean().default(true),
  }).optional(),
});

export const exportDocumentsSchema = z.object({
  documentIds: z.array(z.string().cuid()).optional(), // If empty, export all
  format: z.enum(['markdown', 'mdx', 'json', 'zip']),
  includeAssets: z.boolean().default(false),
  includeVersions: z.boolean().default(false),
});

// Type exports for TypeScript
export type Document = z.infer<typeof documentSchema>;
export type CreateDocument = z.infer<typeof createDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type PublishDocument = z.infer<typeof publishDocumentSchema>;
export type ReorderDocuments = z.infer<typeof reorderDocumentsSchema>;
export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type MDXContent = z.infer<typeof mdxContentSchema>;
export type SearchDocuments = z.infer<typeof searchDocumentsSchema>;
export type BulkDocumentOperation = z.infer<typeof bulkDocumentOperationSchema>;
export type DocumentAnalytics = z.infer<typeof documentAnalyticsSchema>;
export type ImportDocuments = z.infer<typeof importDocumentsSchema>;
export type ExportDocuments = z.infer<typeof exportDocumentsSchema>;
