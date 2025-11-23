# DokuNote Development Plan

## Overview
This plan outlines the development phases for DokuNote, a multi-tenant documentation platform built with Next.js 15, React 19, TypeScript, MDX, and PostgreSQL.

**Tech Stack Summary:**
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, MDX
- **UI:** shadcn/ui, shadcn/ui Blocks, Tailwind CSS, Radix UI
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** NextAuth.js with PostgreSQL adapter
- **APIs:** Next.js Route Handlers, Server Actions, Zod validation
- **Data Fetching:** TanStack Query
- **Search:** MiniSearch or Lunr.js (MVP), self-hosted Meilisearch (optional upgrade) - abstracted in `lib/search/*`
- **Logging:** pino (pretty logs in dev, JSON in production)
- **Infrastructure:** Hetzner Cloud, Docker, Nginx, GitHub Actions CI/CD

---

## 🚀 MVP FIRST APPROACH (RECOMMENDED)

### MVP Timeline: 6-8 Weeks
**Focus on core value proposition with minimal viable features:**

| Week | Focus Area | Key Deliverables |
|------|------------|-----------------|
| 1-2 | Foundation | Project setup, database, auth, basic UI |
| 3-4 | Core Docs | Projects, simple editor, document management |
| 5-6 | Publishing | Public docs, basic search, deployment |
| 7-8 | Polish | Security, testing, launch preparation |

**MVP Scope:**
- ✅ User authentication (NextAuth.js)
- ✅ Multi-tenant organization
- ✅ Basic document creation/editing (simple markdown)
- ✅ Project management
- ✅ Public documentation publishing
- ✅ Client-side search (MiniSearch)
- ✅ Basic analytics (page views)
- ✅ Production deployment

**MVP Excluded (Add in v2):**
- ❌ Advanced MDX editor (start with simple markdown)
- ❌ Marketing site
- ❌ Advanced analytics dashboard
- ❌ Complex search (Meilisearch)
- ❌ Comprehensive testing suite

### Post-MVP Iterations (Weeks 9-16)
After MVP launch, iterate based on user feedback:
- Advanced editor features
- Analytics dashboard
- Marketing site
- Performance optimization
- Advanced search
- Security hardening

---

## FULL DEVELOPMENT PLAN (16 Weeks)

*Use this for comprehensive development after MVP validation*

## Phase 1: Foundation & Infrastructure Setup (Week 1-2)

### 1.1 Project Initialization
**Duration:** 2-3 days

**Tasks:**
- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Configure Tailwind CSS and PostCSS
- [ ] Set up ESLint, Prettier, and TypeScript strict mode
- [ ] Initialize Git repository and create `.gitignore`
- [ ] Set up folder structure according to specification
- [ ] Configure `next.config.mjs` for MDX support
- [ ] Create base `tsconfig.json` with strict settings

**Deliverables:**
- Working Next.js project with TypeScript
- Complete folder structure
- Basic configuration files

**Acceptance Criteria:**
- Project runs without errors (`npm run dev`)
- TypeScript compilation succeeds
- Folder structure matches specification

---

### 1.2 Database Setup & Prisma Configuration
**Duration:** 2-3 days

**Tasks:**
- [ ] Set up PostgreSQL database (local development)
- [ ] Install and configure Prisma
- [ ] Design database schema:
  - [ ] Tenant/Organization model
  - [ ] User model
  - [ ] UserTenant join table (for many-to-many user-tenant relationship)
  - [ ] Project model (tenant-scoped)
  - [ ] Document model (with MDX content, project-scoped)
  - [ ] Document version/history model
  - [ ] Analytics events model (tenant-scoped)
  - [ ] Session model (for NextAuth)
- [ ] Create initial Prisma migrations
- [ ] Set up Prisma client singleton (`lib/db.ts`)
- [ ] Configure Prisma logging integration (forward to pino logger)
- [ ] Create seed script for development data

**Deliverables:**
- `prisma/schema.prisma` with complete schema
- Initial migrations
- Database connection utilities

**Acceptance Criteria:**
- Database schema supports multi-tenancy
- Prisma client generates correctly
- Seed script populates test data

---

### 1.3 UI Component Library Setup
**Duration:** 3-4 days

**Tasks:**
- [ ] Install and configure shadcn/ui
- [ ] Set up Tailwind CSS theme configuration
- [ ] Install core shadcn/ui components:
  - [ ] Button, Input, Label, Textarea
  - [ ] Card, Dialog, Dropdown Menu
  - [ ] Form components
  - [ ] Navigation components (Sidebar, Tabs, Sheet/Drawer for mobile)
  - [ ] Toast/Alert components
  - [ ] ScrollArea (for tables on mobile)
- [ ] Set up shadcn/ui Blocks integration:
  - [ ] Create `components/blocks/` folder structure (marketing/, dashboard/, docs/)
  - [ ] Establish Blocks integration workflow (paste from ui.shadcn.com/blocks, customize)
- [ ] Implement design system principles:
  - [ ] Mobile-first responsive strategy
  - [ ] Compact, modern design (smaller fonts, tighter spacing)
  - [ ] Typography: `text-sm` on mobile, `text-base` on md+ for docs
  - [ ] Heading sizes: smaller than typical marketing (e.g., `text-3xl` instead of `text-5xl`)
  - [ ] Default spacing: `space-y-3` / `gap-3` (larger `space-y-6+` only for hero sections)
  - [ ] Cards: `rounded-lg` with subtle borders
  - [ ] Tables: `text-sm` with `[&_th]:py-2 [&_td]:py-1.5` padding
- [ ] Create base layout components:
  - [ ] `components/common/logo.tsx`
  - [ ] `components/common/theme-toggle.tsx`
  - [ ] `components/common/user-menu.tsx`
- [ ] Set up dark mode support
- [ ] Create global styles (`styles/globals.css`)

**Deliverables:**
- Complete shadcn/ui component library
- Base UI components
- Theme configuration

**Acceptance Criteria:**
- All shadcn/ui components render correctly
- Dark mode works
- Components are accessible (Radix UI)

---

### 1.4 Enhanced Logging & Monitoring Setup
**Duration:** 2 days

**Tasks:**
- [ ] Install pino and pino-pretty
- [ ] Create enhanced logger utility (`lib/logger.ts`) with request tracking:
  ```typescript
  interface LogContext {
    userId?: string;
    tenantId?: string;
    requestId: string;
    userAgent?: string;
  }
  ```
- [ ] Implement `withRequestLogging` middleware for automatic request tracking
- [ ] Configure development logging (pretty, colored via pino-pretty)
- [ ] Configure production logging (structured JSON to stdout)
- [ ] Integrate logger with Prisma client (`lib/db.ts`)
- [ ] Set up error storage in PostgreSQL (via pino logger)
- [ ] Create error dashboard endpoint for viewing errors
- [ ] Set up logging in route handlers with context (tenantId, userId, requestId)
- [ ] Document logging patterns and examples
- [ ] Implement memory-based rate limiting (`lib/rate-limit.ts`):
  - [ ] API endpoints (100 requests/minute per IP)
  - [ ] Search endpoints (10 requests/minute per user)
  - [ ] Authentication endpoints (5 attempts/minute per IP)

**Deliverables:**
- Enhanced logger utility with request tracking
- Error monitoring system (PostgreSQL-based)
- Rate limiting middleware
- Logging and monitoring documentation

**Acceptance Criteria:**
- Logger works in development (pretty logs) and production (JSON logs)
- Request tracking works with unique requestIds
- Errors are stored in PostgreSQL and accessible via dashboard
- Rate limiting prevents abuse
- All logs include tenant context for security auditing
- Prisma logs forward to logger

---

### 1.5 Infrastructure & CI/CD Setup
**Duration:** 3-4 days

**Repository & Server Information:**
- **GitHub Repository:** https://github.com/georgecirdei/DokuNote.git
- **Production Server:** Hetzner Cloud CX23 (Ubuntu 22.04)
- **Server IP:** 91.107.194.203

**Tasks:**
- [ ] Initialize Git repository and connect to GitHub:
  - [ ] Set remote: `git remote add origin https://github.com/georgecirdei/DokuNote.git`
  - [ ] Push initial commit
- [ ] Create Dockerfile for Next.js application
- [ ] Create `docker-compose.yml` for local development
- [ ] Set up Nginx configuration for reverse proxy
- [ ] Configure GitHub Actions workflow (`.github/workflows/ci-cd.yml`):
  - [ ] Lint and type checking
  - [ ] Build verification
  - [ ] Database migration checks
  - [ ] Docker image build
  - [ ] Deployment to Hetzner Cloud server (91.107.194.203)
  - [ ] Set up GitHub Secrets for deployment:
    - [ ] `HETZNER_HOST` (91.107.194.203)
    - [ ] `HETZNER_USER` (SSH username)
    - [ ] `HETZNER_SSH_KEY` (SSH private key)
    - [ ] `HETZNER_DEPLOY_PATH` (deployment directory)
- [ ] Set up environment variable management
- [ ] Create `.env.example` file
- [ ] Configure deployment scripts
- [ ] Document log access (Docker: `docker logs`, systemd: `journalctl`)
- [ ] Document server access and deployment process

**Deliverables:**
- Docker configuration
- CI/CD pipeline
- Deployment documentation

**Acceptance Criteria:**
- Docker container builds successfully
- CI/CD pipeline runs on push
- Deployment process is documented

---

## Phase 2: Authentication & Multi-Tenancy (Week 3-4)

### 2.1 NextAuth.js Setup
**Duration:** 3-4 days

**Tasks:**
- [ ] Install NextAuth.js and PostgreSQL adapter
- [ ] Configure NextAuth.js (`lib/auth.ts`)
- [ ] Set up authentication providers (Email/Password, OAuth options)
- [ ] Create NextAuth API route (`app/api/auth/[...nextauth]/route.ts`)
- [ ] Implement session management
- [ ] Create authentication pages:
  - [ ] `app/(auth)/sign-in/page.tsx`
  - [ ] `app/(auth)/sign-up/page.tsx`
  - [ ] `app/(auth)/reset-password/page.tsx`
- [ ] Create auth server actions (`features/auth/actions.ts`)
- [ ] Create auth helpers (`features/auth/helpers.ts`)
- [ ] Implement auth hooks (`hooks/use-auth.ts`)
- [ ] Add TypeScript module augmentation (`types/next-auth.d.ts`)

**Deliverables:**
- Complete authentication system
- Auth pages with shadcn/ui components
- Session management

**Acceptance Criteria:**
- Users can sign up, sign in, and reset passwords
- Sessions persist correctly
- Protected routes redirect unauthenticated users

---

### 2.2 Enhanced Multi-Tenancy Implementation
**Duration:** 5-6 days

**Tasks:**
- [ ] Implement enhanced tenant resolution utilities (`lib/multitenancy.ts`):
  - [ ] Helper to resolve current tenant ID from session
  - [ ] Support for future subdomain-based resolution
  - [ ] Active tenant selection via dashboard (DB relationship)
  - [ ] **Enhanced Security**: Implement `requireTenant()` function for strict tenant validation:
    ```typescript
    export async function requireTenant(tenantId: string, userId: string) {
      const access = await prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId, tenantId } }
      });
      if (!access) throw new Error('Unauthorized tenant access');
      return access;
    }
    ```
  - [ ] **Security Middleware**: Implement `withTenantAuth()` middleware for automatic tenant validation
- [ ] Set up tenant context and hooks (`hooks/use-tenant.ts`)
- [ ] Implement tenant-scoped database queries with enhanced security:
  - [ ] All queries must accept `tenantId` or derive from session
  - [ ] Never operate on unscoped data
  - [ ] Add mandatory tenant validation to all data access
  - [ ] Add logging with tenant context (tenantId, userId, requestId)
- [ ] **Database Security**: Add critical indexes for tenant isolation and performance:
  ```sql
  @@index([tenantId, projectId])  // on Document
  @@index([tenantId, createdAt])  // on AnalyticsEvent  
  @@index([tenantId, userId])     // on UserTenant
  @@index([tenantId, slug])       // on Project
  ```
- [ ] Create tenant API routes with security middleware (`app/api/tenants/route.ts`)
- [ ] Create tenant server actions with tenant validation (`features/tenants/actions.ts`)
- [ ] Create tenant queries with mandatory scoping (`features/tenants/queries.ts`)
- [ ] Add tenant validation schemas (`lib/validation/tenant-schemas.ts`)
- [ ] Implement active tenant selection/switching in dashboard
- [ ] Ensure UserTenant join table relationships work correctly with proper constraints
- [ ] Add comprehensive logging for tenant operations (create/update/access with full context)
- [ ] **Security Testing**: Create tenant isolation tests to verify data cannot leak between tenants

**Deliverables:**
- Enhanced multi-tenant architecture with security middleware
- Tenant-scoped data access with strict validation
- Tenant management utilities with logging
- Database indexes optimized for tenant isolation
- Security tests for tenant data isolation

**Acceptance Criteria:**
- Data is strictly isolated by tenant with middleware validation
- Users can only access their tenant's data (enforced by `requireTenant()`)
- Unauthorized tenant access attempts are logged and blocked
- Database queries are optimized with proper indexes
- Tenant context is available throughout the app
- Security tests verify complete tenant isolation

---

### 2.3 Dashboard Layout & Navigation
**Duration:** 2-3 days

**Tasks:**
- [ ] Create dashboard layout (`app/(dashboard)/layout.tsx`)
- [ ] Build sidebar component (`components/blocks/dashboard/sidebar.tsx`):
  - [ ] Mobile: Hidden, accessible via hamburger menu (Sheet/Drawer)
  - [ ] Desktop: Fixed sidebar (`w-60` or compact icon variant)
  - [ ] Responsive: `md:flex-row` layout
- [ ] Build header component (`components/blocks/dashboard/header.tsx`):
  - [ ] Mobile: Hamburger menu for navigation
  - [ ] User menu integration
  - [ ] Tenant selector (if user belongs to multiple tenants)
- [ ] Implement navigation between projects and docs
- [ ] Add user menu integration
- [ ] Create dashboard overview page (`app/(dashboard)/page.tsx`)
- [ ] Build stats cards component (`components/blocks/dashboard/stats-cards.tsx`)
- [ ] Apply compact design principles (spacing, typography)

**Deliverables:**
- Complete dashboard shell
- Navigation components
- Dashboard overview page

**Acceptance Criteria:**
- Dashboard layout renders correctly
- Navigation works between sections
- User can access all main areas

---

## Phase 3: Core Documentation Features (Week 5-7)

### 3.1 Project Management
**Duration:** 4-5 days

**Tasks:**
- [ ] Create project list page (`app/(dashboard)/projects/page.tsx`)
- [ ] Create project detail page (`app/(dashboard)/projects/[projectId]/page.tsx`)
- [ ] Create project settings page (`app/(dashboard)/projects/[projectId]/settings/page.tsx`)
- [ ] Implement project server actions (`features/docs/actions.ts` - project-related)
- [ ] Implement project queries (`features/docs/queries.ts` - project-related)
- [ ] Add project validation schemas
- [ ] Create project creation/editing forms
- [ ] Implement project deletion
- [ ] Add logging for project operations (create/update/delete)

**Deliverables:**
- Project CRUD operations
- Project management UI
- Project settings

**Acceptance Criteria:**
- Users can create, view, edit, and delete projects
- Projects are tenant-scoped
- Project settings persist correctly

---

### 3.2 Document Editor Implementation (Phased Approach)
**Duration:** 4-5 days (MVP), 8-10 days (Full)

**MVP Phase (4-5 days) - Simple Markdown Editor:**
- [ ] **Start Simple**: Use `@uiw/react-md-editor` or similar pre-built component
- [ ] Set up basic MDX parsing (`features/docs/mdx/parse.ts`)
- [ ] Set up basic MDX serialization (`features/docs/mdx/serialize.ts`)
- [ ] Create simple editor component with live preview
- [ ] Implement basic auto-save functionality
- [ ] Add syntax highlighting for code blocks
- [ ] Test markdown rendering reliability

**Full Phase (Additional 3-5 days) - Advanced Editor:**
- [ ] **Upgrade Path**: Research and integrate advanced editor (TipTap, Lexical)
- [ ] Enhance MDX parsing with custom components
- [ ] Create advanced markdown toolbar
- [ ] Implement drag-and-drop image upload
- [ ] Add table editing support
- [ ] Implement advanced keyboard shortcuts
- [ ] Add collaborative editing hooks (for future)
- [ ] Performance optimization for large documents

**Technical Implementation:**
```typescript
// Phase 1: Simple approach
import MDEditor from '@uiw/react-md-editor';

// Phase 2: Advanced approach  
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
```

**MVP Deliverables:**
- Working markdown editor with live preview
- Basic MDX parsing/serialization
- Auto-save functionality
- Syntax highlighting

**Full Deliverables:**
- Advanced MDX editor with rich editing
- Complete MDX parsing/serialization utilities
- Advanced editor UI components
- Image upload and table support

**MVP Acceptance Criteria:**
- Users can create and edit markdown documents
- Live preview shows rendered markdown
- Auto-save prevents data loss
- Basic syntax highlighting works

**Full Acceptance Criteria:**
- Editor supports all advanced markdown/MDX features
- Rich editing interface with toolbar
- Image upload and embedding works
- Table editing is intuitive
- Performance is good with large documents

---

### 3.3 Document Management
**Duration:** 4-5 days

**Tasks:**
- [ ] Create document list page (`app/(dashboard)/projects/[projectId]/docs/page.tsx`)
- [ ] Create document editor/viewer page (`app/(dashboard)/projects/[projectId]/docs/[slug]/page.tsx`)
- [ ] Implement document server actions:
  - [ ] Create document
  - [ ] Update document
  - [ ] Delete document
  - [ ] List documents
- [ ] Implement document queries
- [ ] Add document validation schemas (`lib/validation/docs-schemas.ts`)
- [ ] Create document API routes (`app/api/docs/`)
- [ ] Implement document versioning/history
- [ ] Add document metadata (title, description, tags)
- [ ] Implement document hierarchy/nesting
- [ ] Add document reordering
- [ ] Add logging for document operations (create/update/delete with context)

**Deliverables:**
- Complete document CRUD
- Document management UI
- Document versioning

**Acceptance Criteria:**
- Users can create, edit, and delete documents
- Documents save MDX content correctly
- Document hierarchy works
- Version history is accessible

---

### 3.4 Document Navigation & Organization
**Duration:** 3-4 days

**Tasks:**
- [ ] Create docs sidebar component (`components/blocks/docs/docs-sidebar.tsx`):
  - [ ] Mobile: Collapsed into menu
  - [ ] Desktop: Visible sidebar (`md+`)
- [ ] Create docs layout component (`components/blocks/docs/docs-layout.tsx`):
  - [ ] Centered content (`max-w-3xl` or `max-w-4xl`)
  - [ ] Responsive sidebar integration
- [ ] Implement document tree structure
- [ ] Add drag-and-drop reordering
- [ ] Create table of contents component (`components/blocks/docs/toc.tsx`)
- [ ] Implement document search within project
- [ ] Add document breadcrumbs
- [ ] Apply compact design principles

**Deliverables:**
- Document navigation UI
- Tree structure management
- TOC generation

**Acceptance Criteria:**
- Document tree displays correctly
- Users can reorder documents
- TOC updates automatically
- Navigation is intuitive

---

## Phase 4: Search & Analytics (Week 8-9)

### 4.1 Search Implementation (Layered Approach)
**Duration:** 3-4 days (MVP), 6-7 days (Full)

**MVP Phase (3-4 days) - Client-Side Search:**
- [ ] **Choose MVP**: Use MiniSearch (recommended for simplicity and performance)
- [ ] Set up search abstraction layer (`lib/search/index.ts`) with interface:
  ```typescript
  interface SearchProvider {
    indexDocuments(projectId: string, documents: Document[]): Promise<void>;
    search(projectId: string, query: string): Promise<SearchResult[]>;
    removeDocument(projectId: string, docId: string): Promise<void>;
  }
  ```
- [ ] Implement MiniSearch provider (`lib/search/minisearch.ts`)
- [ ] **Client-Side Indexing**: Build search index per project in browser
- [ ] Create simple search UI component (search input + results)
- [ ] Implement basic search results display
- [ ] Add search to public docs pages
- [ ] Create search hook (`hooks/use-search.ts`)
- [ ] Add basic search analytics logging

**Full Phase (Additional 2-3 days) - Server-Side Search:**
- [ ] **Server-Side API**: Create search API route (`app/api/search/route.ts`)
- [ ] Implement server-side indexing with background jobs
- [ ] Add search highlighting and advanced ranking
- [ ] Implement pagination for search results
- [ ] Add search to dashboard
- [ ] **Optional Upgrade Path**: Prepare Meilisearch integration (`lib/search/meilisearch.ts`)
- [ ] Add comprehensive search analytics
- [ ] Create search configuration (`config/search.ts`)

**Search Strategy:**
```typescript
// MVP: Client-side search per project
interface SearchIndex {
  projectId: string;
  documents: {
    id: string;
    title: string;
    content: string;
    lastModified: Date;
  }[];
  lastIndexed: Date;
}

// Full: Server-side with upgrade path
// Phase 1: MiniSearch server-side
// Phase 2: Self-hosted Meilisearch (when scaling)
```

**MVP Deliverables:**
- Client-side search with MiniSearch
- Search abstraction layer for future upgrades
- Basic search UI
- Search integration in public docs

**Full Deliverables:**
- Server-side search API
- Advanced search UI with highlighting
- Search analytics
- Meilisearch upgrade path prepared

**MVP Acceptance Criteria:**
- Search works within each project's documents
- Search is fast and responsive (client-side)
- Search abstraction allows easy upgrade to server-side
- Basic search analytics track queries

**Full Acceptance Criteria:**
- Server-side search scales with document count
- Search highlighting shows relevant matches
- Search results are ranked appropriately
- Search abstraction allows easy swap to Meilisearch
- Comprehensive analytics track search behavior

---

### 4.2 Analytics System
**Duration:** 5-6 days

**Tasks:**
- [ ] Design analytics event schema (PostgreSQL):
  - [ ] Page views for public docs
  - [ ] Search queries
  - [ ] 404 / not-found page hits for missing docs
  - [ ] Tenant-scoped events
- [ ] Create analytics tracking utilities (`lib/analytics/tracker.ts`)
- [ ] Implement analytics API routes:
  - [ ] `app/api/analytics/events/route.ts` (track events)
  - [ ] `app/api/analytics/summary/route.ts` (aggregated data)
- [ ] Create analytics server actions (`features/analytics/actions.ts`)
- [ ] Create analytics queries (`features/analytics/queries.ts`)
- [ ] Implement periodic or on-demand aggregation for dashboard views
- [ ] Build analytics dashboard:
  - [ ] Page views chart
  - [ ] Popular documents
  - [ ] Search query analytics
  - [ ] 404 tracking
- [ ] Create chart components (`components/charts/traffic-chart.tsx`)
- [ ] Implement client-side event tracking
- [ ] Add analytics hook (`hooks/use-analytics.ts`)
- [ ] Create analytics configuration (`config/analytics.ts`)
- [ ] Add logging for analytics events

**Deliverables:**
- Complete analytics system
- Analytics dashboard
- Event tracking

**Acceptance Criteria:**
- Events are tracked correctly
- Analytics dashboard displays data
- Data is aggregated properly
- Analytics are tenant-scoped

---

## Phase 5: Public Documentation (Week 10-11)

### 5.1 Public Documentation Viewer
**Duration:** 4-5 days

**Tasks:**
- [ ] Create public docs route (`app/(public-docs)/[tenant]/[projectSlug]/[...docSlug]/page.tsx`)
- [ ] Implement public document rendering
- [ ] Create public docs layout (no auth required)
- [ ] Add public navigation/sidebar
- [ ] Implement MDX rendering for public pages
- [ ] Add public TOC
- [ ] Create public documentation theme/styling
- [ ] Implement public search (if enabled)
- [ ] Add public analytics tracking

**Deliverables:**
- Public documentation viewer
- Public navigation
- Public styling

**Acceptance Criteria:**
- Public docs are accessible without authentication
- MDX renders correctly in public view
- Navigation works for public users
- Analytics track public views

---

### 5.2 Publishing & Configuration
**Duration:** 3-4 days

**Tasks:**
- [ ] Add publish/unpublish toggle for projects
- [ ] Implement public URL generation
- [ ] Create publishing settings in project settings
- [ ] Add custom domain support (future)
- [ ] Implement public access controls
- [ ] Add SEO metadata for public docs
- [ ] Create sitemap generation

**Deliverables:**
- Publishing controls
- Public URL management
- SEO optimization

**Acceptance Criteria:**
- Projects can be published/unpublished
- Public URLs work correctly
- SEO metadata is present

---

## Phase 6: Marketing & Public Pages (Week 12)

### 6.1 Marketing Site
**Duration:** 3-4 days

**Tasks:**
- [ ] Create marketing layout (`app/(marketing)/layout.tsx`)
- [ ] Build landing page (`app/(marketing)/page.tsx`)
- [ ] Create hero component (`components/blocks/marketing/hero.tsx`)
- [ ] Create pricing component (`components/blocks/marketing/pricing.tsx`)
- [ ] Create footer component (`components/blocks/marketing/footer.tsx`)
- [ ] Add feature highlights
- [ ] Create about/features pages
- [ ] Add call-to-action sections

**Deliverables:**
- Complete marketing site
- Landing page
- Marketing components

**Acceptance Criteria:**
- Marketing site is visually appealing
- CTAs drive sign-ups
- Site is responsive

---

### 6.2 Settings & Account Management
**Duration:** 2-3 days

**Tasks:**
- [ ] Create account settings page (`app/(dashboard)/settings/page.tsx`)
- [ ] Implement profile editing
- [ ] Add password change functionality
- [ ] Create tenant settings
- [ ] Add billing integration (future)
- [ ] Implement account deletion

**Deliverables:**
- Settings pages
- Account management

**Acceptance Criteria:**
- Users can update their profile
- Settings persist correctly
- Account deletion works

---

## Phase 7: Testing & Quality Assurance (Week 13-14)

### 7.1 Unit & Integration Testing
**Duration:** 5-6 days

**Tasks:**
- [ ] Set up Jest and React Testing Library
- [ ] Write tests for server actions
- [ ] Write tests for API routes
- [ ] Write tests for utility functions
- [ ] Write tests for components
- [ ] Write tests for hooks
- [ ] Add E2E tests with Playwright/Cypress
- [ ] Test multi-tenancy isolation
- [ ] Test authentication flows

**Deliverables:**
- Test suite
- Test coverage report
- E2E test scenarios

**Acceptance Criteria:**
- Test coverage > 70%
- All critical paths are tested
- Tests run in CI/CD

---

### 7.2 Performance Optimization
**Duration:** 3-4 days

**Tasks:**
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Implement caching strategies
- [ ] Optimize images and assets
- [ ] Add code splitting
- [ ] Optimize bundle size
- [ ] Implement lazy loading
- [ ] Add performance monitoring

**Deliverables:**
- Performance optimizations
- Performance metrics

**Acceptance Criteria:**
- Page load times < 2s
- Lighthouse score > 90
- Database queries are optimized

---

## Phase 8: Security & Production Readiness (Week 15)

### 8.1 Enhanced Security Hardening
**Duration:** 5-6 days

**Tasks:**
- [ ] **Enhanced Rate Limiting**: Implement memory-based rate limiting (upgrade to Redis later):
  - [ ] API endpoints: 100 requests/minute per IP
  - [ ] Search endpoints: 10 requests/minute per user  
  - [ ] Authentication endpoints: 5 attempts/minute per IP
  - [ ] Create `withRateLimit` middleware for easy application
- [ ] **CSRF Protection**: Add CSRF tokens to forms and API endpoints
- [ ] **Input Sanitization**: Implement comprehensive input validation with Zod schemas
- [ ] **Security Headers**: Configure security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] **Vulnerability Scanning**: Review and fix security vulnerabilities using `npm audit`
- [ ] **Enhanced Error Handling**: Implement proper error boundaries and secure error messages
- [ ] **Error Tracking & Monitoring** (already implemented in Phase 1.4):
  - [ ] ✅ Error logging to PostgreSQL via pino logger (Phase 1.4)
  - [ ] ✅ Error dashboard endpoint for viewing errors (Phase 1.4)  
  - [ ] Enhance error dashboard with filtering and search
  - [ ] Set up error alerting thresholds
  - [ ] Optional: Self-host GlitchTip if advanced error tracking needed
- [ ] **Authentication Security Review**:
  - [ ] Audit NextAuth.js configuration
  - [ ] Implement session timeout
  - [ ] Add password strength requirements
  - [ ] Enable 2FA preparation (optional)
- [ ] **Multi-Tenancy Security Audit** (builds on Phase 2.2):
  - [ ] ✅ Tenant isolation middleware (Phase 2.2)
  - [ ] ✅ Database indexes for performance (Phase 2.2)
  - [ ] Security penetration testing for tenant isolation
  - [ ] Audit all API endpoints for tenant scoping
  - [ ] Test unauthorized access scenarios
- [ ] **Additional Security Measures**:
  - [ ] Implement request signing for sensitive operations
  - [ ] Add IP whitelisting for admin operations (optional)
  - [ ] Set up security monitoring alerts
  - [ ] Create security incident response plan

**Enhanced Security Middleware Stack:**
```typescript
// Example security middleware composition
export function withSecurity(handler: Function) {
  return withRequestLogging(
    withRateLimit('general', 100, 60000)(
      withTenantAuth(
        withCSRFProtection(handler)
      )
    )
  );
}
```

**Deliverables:**
- Comprehensive security hardening
- Enhanced rate limiting system
- Security monitoring dashboard
- Multi-tenancy security validation
- Security documentation and incident response plan

**Acceptance Criteria:**
- No critical security vulnerabilities
- Rate limiting prevents abuse across all endpoints
- Error tracking provides actionable insights
- Multi-tenancy security is verified through testing
- All API endpoints are properly secured
- Security monitoring alerts work correctly
- Tenant isolation is bulletproof (verified through penetration testing)

---

### 8.2 Production Deployment
**Duration:** 3-4 days

**Production Server Details:**
- **Provider:** Hetzner Cloud
- **Instance Type:** CX23
- **OS:** Ubuntu 22.04
- **Public IP:** 91.107.194.203
- **Domain:** dokunote.com

**Tasks:**
- [ ] Set up SSH access to production server (91.107.194.203)
- [ ] Configure server security:
  - [ ] Set up firewall (UFW)
  - [ ] Configure SSH key authentication
  - [ ] Disable password authentication
  - [ ] Set up fail2ban
- [ ] Install required software on server:
  - [ ] Node.js (LTS version)
  - [ ] PostgreSQL (production database)
  - [ ] Nginx
  - [ ] Docker & Docker Compose (if using containerized deployment)
  - [ ] Certbot (for SSL certificates)
- [ ] Set up production database:
  - [ ] Create PostgreSQL database and user
  - [ ] Configure database backups (automated daily backups)
  - [ ] Set up database connection pooling
- [ ] Configure production environment variables:
  - [ ] Database connection strings
  - [ ] NextAuth secrets
  - [ ] API keys and secrets
  - [ ] Environment-specific configs
- [ ] Set up SSL certificates:
  - [ ] Configure domain DNS for dokunote.com (A record pointing to 91.107.194.203)
  - [ ] Obtain SSL certificate via Let's Encrypt (Certbot) for dokunote.com
  - [ ] Configure auto-renewal
- [ ] Configure Nginx for production:
  - [ ] Reverse proxy to Next.js app (port 3000 or Docker container)
  - [ ] SSL/TLS configuration
  - [ ] Security headers
  - [ ] Static file serving
  - [ ] Rate limiting
- [ ] Set up process management:
  - [ ] Configure PM2 or systemd service for Next.js app
  - [ ] Set up auto-restart on failure
  - [ ] Configure log rotation
- [ ] **Enhanced Database Backup Strategy**:
  - [ ] Automated daily backups with compression:
    ```bash
    # scripts/backup-db.sh
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/backups/postgresql"
    DB_NAME="dokunote"
    
    mkdir -p $BACKUP_DIR
    pg_dump $DB_NAME | gzip > $BACKUP_DIR/dokunote_$DATE.sql.gz
    find $BACKUP_DIR -name "dokunote_*.sql.gz" -mtime +30 -delete
    ```
  - [ ] Schedule via crontab: `0 2 * * * /path/to/scripts/backup-db.sh`
  - [ ] Backup retention policy (30 days)
  - [ ] Test backup restoration process weekly
  - [ ] Optional: Cloud backup storage (AWS S3, Hetzner Object Storage)
- [ ] Configure monitoring and alerts:
  - [ ] Set up server monitoring (CPU, memory, disk)
  - [ ] Configure application health checks
  - [ ] Set up uptime monitoring
  - [ ] Configure alert notifications
- [ ] Create deployment runbook:
  - [ ] Document deployment process
  - [ ] Document rollback procedure
  - [ ] Document troubleshooting steps
  - [ ] Document server access procedures
- [ ] Perform production deployment:
  - [ ] Run database migrations
  - [ ] Deploy application code
  - [ ] Verify application starts correctly
  - [ ] Test critical functionality
- [ ] Verify production functionality:
  - [ ] Test authentication flow
  - [ ] Test document creation/editing
  - [ ] Test public documentation access
  - [ ] Verify SSL certificate works
  - [ ] Check performance metrics
- [ ] Set up staging environment (optional):
  - [ ] Configure separate staging server or subdomain
  - [ ] Set up staging database
  - [ ] Configure staging deployment pipeline

**Deliverables:**
- Production deployment
- Deployment documentation
- Monitoring dashboard

**Acceptance Criteria:**
- Application runs in production
- SSL is configured
- Backups are automated
- Monitoring is active

---

## Phase 9: Documentation & Launch (Week 16)

### 9.1 User Documentation
**Duration:** 2-3 days

**Tasks:**
- [ ] Write user guide
- [ ] Create video tutorials
- [ ] Write API documentation
- [ ] Create FAQ
- [ ] Write migration guide

**Deliverables:**
- Complete user documentation
- Tutorials

**Acceptance Criteria:**
- Documentation is comprehensive
- Users can follow guides easily

---

### 9.2 Launch Preparation
**Duration:** 2-3 days

**Tasks:**
- [ ] Final testing in production
- [ ] Prepare launch announcement
- [ ] Set up support channels
- [ ] Create onboarding flow
- [ ] Monitor initial users
- [ ] Gather feedback

**Deliverables:**
- Launch-ready application
- Support infrastructure

**Acceptance Criteria:**
- Application is stable
- Support channels are ready
- Onboarding works smoothly

---

## Timeline Summary

### 🚀 MVP Timeline (RECOMMENDED): 6-8 weeks

| Week | Focus Area | Key Deliverables | MVP Scope |
|------|------------|------------------|-----------|
| 1-2 | Foundation | Project setup, database, enhanced auth, logging with monitoring | ✅ Core infrastructure |
| 3-4 | Core Docs | Projects, simple markdown editor, document management | ✅ Basic document editing |
| 5-6 | Publishing | Public docs, client-side search, basic analytics | ✅ Public documentation |
| 7-8 | Launch Prep | Security hardening, deployment, testing | ✅ Production ready |

**MVP Features:**
- User authentication & multi-tenancy
- Simple markdown editor (not advanced MDX)  
- Project & document management
- Public documentation publishing
- Client-side search (MiniSearch)
- Basic analytics (page views)
- Enhanced security & monitoring

### 📈 Full Feature Timeline: 16 weeks

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| Phase 1: Foundation | 2 weeks | Project setup, database, enhanced UI library, monitoring & rate limiting |
| Phase 2: Auth & Multi-tenancy | 2 weeks | Authentication, enhanced multi-tenancy with security middleware, dashboard |
| Phase 3: Core Docs | 3 weeks | Projects, advanced MDX editor (phased), document management |
| Phase 4: Search & Analytics | 2 weeks | Server-side search, comprehensive analytics dashboard |
| Phase 5: Public Docs | 2 weeks | Advanced public viewer, publishing features |
| Phase 6: Marketing | 1 week | Marketing site, advanced settings |
| Phase 7: Testing & QA | 2 weeks | Comprehensive test suite, performance optimization |
| Phase 8: Security & Production | 1 week | Enhanced security hardening, production deployment |
| Phase 9: Documentation & Launch | 1 week | Complete documentation, launch preparation |

**Total MVP Duration: 6-8 weeks**
**Total Full Duration: 16 weeks (4 months)**

### Recommended Approach

1. **Start with MVP** (6-8 weeks) - Get to market quickly with core features
2. **Iterate based on feedback** - Add advanced features based on user needs  
3. **Full feature development** - Weeks 9-16 for advanced capabilities

**Key Benefits of MVP-first:**
- ✅ Faster time to market
- ✅ Early user feedback
- ✅ Reduced development risk
- ✅ Cash flow generation sooner
- ✅ Proven market fit before full investment

---

## Key Dependencies

1. **Phase 1 must complete before Phase 2** (infrastructure needed)
2. **Phase 2 must complete before Phase 3** (auth needed for dashboard)
3. **Phase 3.1 (Projects) should complete before Phase 3.2 (Editor)** (projects needed for docs)
4. **Phase 3.2 (Editor) should complete before Phase 3.3 (Documents)** (editor needed for document editing)
5. **Phase 4 can run parallel with Phase 5** (independent features)
6. **Phase 7 requires all previous phases** (testing needs complete features)
7. **Phase 8 requires Phase 7** (security after testing)

---

## Risk Mitigation

1. **MDX Editor Complexity**
   - Risk: Editor implementation may take longer than estimated
   - Mitigation: Start with basic markdown, iterate on advanced features

2. **Multi-Tenancy Security**
   - Risk: Data leakage between tenants
   - Mitigation: Comprehensive testing, code reviews, security audits

3. **Performance at Scale**
   - Risk: Application may slow with many documents
   - Mitigation: Implement pagination, caching, database optimization early

4. **Search Implementation**
   - Risk: Search may not meet performance requirements
   - Mitigation: Start with MiniSearch or Lunr.js (MVP), abstract implementation for easy swap to self-hosted Meilisearch if needed

---

## Success Metrics

- **Technical Metrics:**
  - Page load time < 2 seconds
  - Lighthouse score > 90
  - Test coverage > 70%
  - Zero critical security vulnerabilities

- **Feature Metrics:**
  - Users can create and edit documents successfully
  - Search returns relevant results in < 500ms
  - Analytics track events accurately
  - Public docs load correctly

- **Business Metrics:**
  - User sign-up conversion rate
  - Daily active users
  - Documents created per user
  - Public documentation views

---

## Notes

- This plan assumes a single developer or small team
- Adjust timelines based on team size and experience
- Some phases can be parallelized with multiple developers
- **RECOMMENDED**: Start with MVP approach (6-8 weeks) for faster time to market
- Regular code reviews and testing should happen throughout, not just in Phase 7
- **Design Principles**: Follow compact, modern design throughout (see Phase 1.3)
- **Enhanced Logging**: Implement structured logging (pino) with request tracking to all route handlers and server actions
- **Multi-tenancy Security**: Always scope data by tenant with security middleware - never operate on unscoped data
- **Blocks Integration**: When adding shadcn Blocks, paste from ui.shadcn.com/blocks, customize spacing/typography to match compact design
- **MVP-First Strategy**: Focus on core features first (6-8 weeks), then iterate based on user feedback
- **Security-First**: Implement tenant isolation, rate limiting, and monitoring from day one
- **Performance**: Add database indexes and caching strategies early in development
- **Monitoring**: Built-in error tracking and performance monitoring using PostgreSQL (no external services needed)

## Enhanced Architecture Features

**Security Enhancements:**
- Enhanced multi-tenant security middleware with `requireTenant()` validation
- Memory-based rate limiting (API: 100/min, Search: 10/min, Auth: 5/min)
- Request tracking with unique requestIds for debugging
- Comprehensive tenant isolation testing

**Performance Optimizations:**  
- Database indexes optimized for tenant-scoped queries
- Search abstraction layer (MiniSearch → Meilisearch upgrade path)
- Client-side search for MVP, server-side for scaling
- Enhanced backup strategy with compression and retention

**Monitoring & Operations:**
- Enhanced structured logging with tenant context
- Error storage and dashboard in PostgreSQL (free alternative to Sentry)
- Security monitoring and alerting
- Production-ready deployment with comprehensive health checks

## Non-Goals for MVP (from Architecture Doc)

These are explicitly out of scope for initial MVP, but can be added later:
- Full-blown billing & subscription engine
- Custom domains for each tenant (e.g. docs.company.com)
- Complex role-based permissions beyond basic roles (Owner, Admin, Editor, Viewer)
- Real-time collaborative editing (Google Docs style)
- Complex workflow/approval systems

---

## Production Infrastructure Details

### Repository
- **GitHub Repository:** https://github.com/georgecirdei/DokuNote.git
- **Main Branch:** `main`
- **CI/CD:** GitHub Actions (`.github/workflows/ci-cd.yml`)

### Production Server
- **Provider:** Hetzner Cloud
- **Instance Type:** CX23
- **Operating System:** Ubuntu 22.04 LTS
- **Public IP Address:** 91.107.194.203
- **Domain:** dokunote.com

### Server Access
- **SSH:** `ssh user@91.107.194.203`
- **Deployment Method:** GitHub Actions CI/CD pipeline
- **Process Manager:** PM2 or systemd (to be configured)
- **Web Server:** Nginx (reverse proxy)
- **SSL:** Let's Encrypt (via Certbot)

### Required GitHub Secrets
Configure these in GitHub repository settings → Secrets and variables → Actions:
- `HETZNER_HOST` = `91.107.194.203`
- `HETZNER_USER` = (SSH username for server)
- `HETZNER_SSH_KEY` = (Private SSH key for server access)
- `HETZNER_DEPLOY_PATH` = (Deployment directory, e.g., `/var/www/dokunote`)

### Production Environment Variables
Set these on the production server (in `.env` or systemd environment):
- `DATABASE_URL` = (PostgreSQL connection string)
- `NEXTAUTH_URL` = `https://dokunote.com`
- `NEXTAUTH_SECRET` = (Generated secret for NextAuth)
- `NODE_ENV` = `production`
- Additional API keys and secrets as needed

### Deployment Checklist
- [ ] Domain DNS configured for dokunote.com (A record pointing to 91.107.194.203)
- [ ] SSL certificate obtained and configured for dokunote.com
- [ ] Database backups automated
- [ ] Monitoring and alerts configured
- [ ] Firewall rules configured
- [ ] SSH access secured
- [ ] GitHub Actions secrets configured
- [ ] Production environment variables set (including NEXTAUTH_URL=https://dokunote.com)
- [ ] Nginx reverse proxy configured for dokunote.com
- [ ] Application health checks working

---

## Cost Analysis & Paid Services

### Required Costs

1. **Hetzner Cloud Server (CX23)**
   - **Cost:** ~€4-5/month (~$4-5/month)
   - **Status:** Required
   - **Notes:** Already provisioned at IP 91.107.194.203

2. **Domain Name**
   - **Domain:** dokunote.com
   - **Cost:** ~$12-15/year (typical .com pricing)
   - **Status:** Required for production
   - **Notes:** Domain is already registered, configure DNS A record to point to 91.107.194.203

### Optional/Upgrade Path Costs

3. **Enhanced Error Tracking & Monitoring (Custom Solution)**
   - **Cost:** Free (using enhanced pino logger + PostgreSQL)
   - **Status:** Built-in - Uses existing pino logging infrastructure with enhancements
   - **Features:** Request tracking, tenant-scoped logging, error dashboard, rate limiting
   - **Mentioned in:** Phase 1.4 (Enhanced Logging), Phase 8.1 (Security Hardening)
   - **Implementation:** 
     - Enhanced structured logging with request tracking
     - Error storage in PostgreSQL with dashboard
     - Memory-based rate limiting (upgrade to Redis later if needed)
     - Security monitoring and alerting
   - **Optional Upgrade:** Self-host GlitchTip (open source Sentry alternative) if advanced features needed
   - **Recommendation:** Start with enhanced pino + PostgreSQL monitoring, add GlitchTip only for advanced features

4. **Meilisearch (Alternative Search)**
   - **Cost:** Free (self-hosted on Hetzner server)
   - **Status:** Optional - MVP uses MiniSearch/Lunr.js (free)
   - **Mentioned in:** Phase 4.1 (Search Implementation)
   - **Recommendation:** Use MiniSearch/Lunr.js for MVP, consider self-hosted Meilisearch only if scaling requires it

6. **GitHub Actions (CI/CD)**
   - **Free Tier:** 2,000 minutes/month (public repos), 500 minutes/month (private repos)
   - **Paid Plans:** $4/month for 3,000 additional minutes
   - **Status:** Free for public repositories
   - **Mentioned in:** Phase 1.5 (CI/CD Setup)
   - **Recommendation:** Repository is public, so free tier should be sufficient

7. **OAuth Providers (if implemented)**
   - **Google OAuth:** Free (unlimited users)
   - **GitHub OAuth:** Free (unlimited users)
   - **Microsoft/Azure AD:** Free tier available
   - **Status:** Optional - Email/password auth is free
   - **Mentioned in:** Phase 2.1 (NextAuth.js Setup)
   - **Recommendation:** OAuth providers are free, but optional

### Free/Open Source Components

All of the following are **FREE** and open source:
- ✅ Next.js 15, React 19, TypeScript
- ✅ PostgreSQL (database)
- ✅ Prisma ORM
- ✅ NextAuth.js
- ✅ shadcn/ui, Tailwind CSS, Radix UI
- ✅ TanStack Query
- ✅ Zod validation
- ✅ MiniSearch / Lunr.js (MVP search)
- ✅ pino (logging)
- ✅ Docker, Nginx
- ✅ PM2 / systemd
- ✅ Let's Encrypt SSL certificates (free)
- ✅ Jest, React Testing Library, Playwright/Cypress (testing)

### Estimated Monthly Costs

**MVP/Initial Launch:**
- Hetzner Server: ~€4-5/month (~$4-5/month)
- Domain (dokunote.com): ~$1/month (annual cost divided by 12)
- **Total: ~$5-6/month**

**With Optional Services (if scaling):**
- Hetzner Server: ~€4-5/month
- Domain (dokunote.com): ~$1/month
- Self-hosted Meilisearch (if upgrading search): Free (uses existing server)
- **Total: ~$5-6/month** (all services remain free)

### Cost Optimization Recommendations

1. **Start with MVP stack** - All free/open source components
2. **Use built-in error tracking** - pino logger + PostgreSQL (free, no limits)
3. **Self-host search** - Use MiniSearch/Lunr.js (free), upgrade to self-hosted Meilisearch if needed
4. **Monitor usage** - Track GitHub Actions minutes (free tier sufficient for public repos)
5. **All services remain free** - No paid upgrades needed, everything can be self-hosted

### Notes

- **No license purchases required** - All software is open source and free
- **Domain (dokunote.com) is already registered** - Configure DNS A record to point to 91.107.194.203
- **Server cost is minimal** - Hetzner CX23 is very affordable (~€4-5/month)
- **All services are free** - No paid tiers or upgrades needed
- **Self-hosted solutions** - Error tracking and search can be self-hosted on existing server
- **No scaling costs** - All components scale with your server, no per-usage fees

