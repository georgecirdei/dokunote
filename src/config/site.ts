/**
 * Site-wide configuration
 * Contains app name, URLs, metadata, and other global settings
 */

export const siteConfig = {
  name: 'DokuNote',
  description: 'Enterprise-grade multi-tenant documentation platform',
  url: 'https://dokunote.com',
  ogImage: 'https://dokunote.com/og.jpg',
  
  // Links
  links: {
    twitter: 'https://twitter.com/dokunote',
    github: 'https://github.com/georgecirdei/DokuNote',
    docs: 'https://docs.dokunote.com',
    support: 'mailto:support@dokunote.com',
  },
  
  // Features
  features: {
    enableAnalytics: true,
    enableSubdomains: true,
    enableCustomDomains: false, // Future feature
    enableTeamInvites: true,
    enablePublicDocs: true,
  },
  
  // Limits
  limits: {
    maxProjectsPerTenant: 50,
    maxDocumentsPerProject: 1000,
    maxTeamMembers: 25,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxContentSize: 1 * 1024 * 1024, // 1MB per document
  },
  
  // Plans
  plans: {
    free: {
      name: 'Free',
      maxProjects: 3,
      maxTeamMembers: 3,
      maxStorageGB: 1,
      features: ['Basic documentation', 'Public hosting', 'Community support'],
    },
    pro: {
      name: 'Pro',
      maxProjects: 25,
      maxTeamMembers: 25,
      maxStorageGB: 25,
      features: [
        'Everything in Free',
        'Custom subdomains',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      maxProjects: -1, // Unlimited
      maxTeamMembers: -1, // Unlimited
      maxStorageGB: -1, // Unlimited
      features: [
        'Everything in Pro',
        'Custom domains',
        'SSO integration',
        'Advanced permissions',
        'Dedicated support',
        'SLA guarantee',
      ],
    },
  },
  
  // API
  api: {
    version: 'v1',
    baseUrl: '/api',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // requests per window
    },
  },
  
  // SEO defaults
  seo: {
    defaultTitle: 'DokuNote - Enterprise Documentation Platform',
    defaultDescription: 'Create, collaborate, and publish beautiful documentation with our multi-tenant platform',
    keywords: [
      'documentation',
      'markdown',
      'mdx',
      'collaboration',
      'knowledge base',
      'technical writing',
      'developer tools',
      'enterprise',
    ],
  },
  
  // Theme
  theme: {
    defaultMode: 'system', // 'light' | 'dark' | 'system'
    enableThemeToggle: true,
  },
  
  // Footer
  footer: {
    company: 'DokuNote',
    year: new Date().getFullYear(),
    links: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Security', href: '/security' },
      { name: 'Status', href: 'https://status.dokunote.com' },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;
