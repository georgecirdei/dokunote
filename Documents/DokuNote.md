---
title: "DokuNote – Architecture & Implementation Decisions"
description: "Final technical decisions and conventions for the DokuNote documentation platform."
version: "1.0"
author: "George Cirdei"
date: "2025-11-22"
---

# DokuNote – Final Architecture & Implementation Decisions

This document captures the **final stack, conventions, and patterns** for building the DokuNote platform as an **enterprise-grade, multi-tenant documentation SaaS**.

The goal is to have **one source of truth** for decisions so implementation stays consistent.

---

## 1. Product Goal

DokuNote is a **SaaS documentation platform** that allows tenants (organizations) to:

- Create, edit, and publish **Markdown/MDX-based documentation**.
- Host **public docs** under tenant/project-specific URLs.
- Explore docs with **search** and **compact, modern UI**.
- View **basic analytics** (visits, search queries, etc.).
- Run on an **enterprise-ready, multi-tenant architecture**.

---

## 2. Final Tech Stack

### 2.1 Core Application Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **UI Library:** React 19
- **Language:** TypeScript
- **Content Format:** MDX

### 2.2 UI / Styling / Components

- **Component Library:** `shadcn/ui`
- **Page Sections:** `shadcn/ui` Blocks
- **Styling:** Tailwind CSS
- **Primitives:** Radix UI primitives (used internally by shadcn)

### 2.3 Database & ORM

- **Database:** PostgreSQL
- **ORM:** Prisma

### 2.4 Authentication & Multi-Tenancy

- **Auth Framework:** NextAuth.js
- **Session Storage:** PostgreSQL session adapter
- **Multi-tenancy Model:**
  - Tenants (organizations) stored in DB
  - Users can belong to one or multiple tenants
  - Relations stored via join tables (e.g. `UserTenant`)

### 2.5 APIs & Server Logic

- **API Layer:** Next.js Route Handlers (`app/api/.../route.ts`)
- **Server Business Logic:** Next.js Server Actions (mainly under `src/features/**/actions.ts`)
- **Validation:** Zod schemas for input/output validation
- **Client Data Management:** TanStack Query (server state on the client)

### 2.6 Search

- **MVP Search Engine:** MiniSearch _or_ Lunr.js (local index)
- **Upgrade Path:** Self-hosted Meilisearch (free, can run on same server)
- **Abstraction:** Search logic encapsulated in `src/lib/search/*` so implementation can be swapped.

### 2.7 Analytics

- **Event Ingestion:** Custom endpoints via Route Handlers (e.g. `app/api/analytics/events/route.ts`)
- **Storage:** PostgreSQL tables for events and aggregates
- **Visualization:** Analytics dashboard implemented in Next.js (within `(dashboard)`)

### 2.8 Infrastructure & Deployment

- **Cloud Provider:** Hetzner Cloud VM(s)
- **Runtime:** Node.js
- **Reverse Proxy:** Nginx
- **Containerization:** Docker (optional, but recommended)
- **CI/CD:** GitHub Actions

---

## 3. High-Level Feature Areas

- **Marketing Site**
  - Public landing page, pricing, feature overview (built from shadcn Blocks).
- **Auth & Onboarding**
  - Sign-in, sign-up, password reset (NextAuth + shadcn).
- **Dashboard**
  - Tenant/project management
  - Docs overview & editing
  - Basic analytics
  - Account & tenant settings
- **Public Docs**
  - Public documentation viewer per tenant/project
  - SEO-friendly routes and titles
  - Search inside project docs

---
4. Project & Folder Structure

doku-note/
├─ .github/
│  └─ workflows/
│     └─ ci-cd.yml
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/
│  │  │  ├─ layout.tsx
│  │  │  └─ page.tsx               # public landing
│  │  │
│  │  ├─ (auth)/
│  │  │  ├─ sign-in/
│  │  │  │  └─ page.tsx
│  │  │  ├─ sign-up/
│  │  │  │  └─ page.tsx
│  │  │  └─ reset-password/
│  │  │     └─ page.tsx
│  │  │
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx             # dashboard shell (sidebar, header)
│  │  │  ├─ page.tsx               # main overview / analytics
│  │  │  ├─ projects/
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [projectId]/
│  │  │  │     ├─ page.tsx         # project overview
│  │  │  │     ├─ settings/
│  │  │  │     │  └─ page.tsx
│  │  │  │     └─ docs/
│  │  │  │        ├─ page.tsx      # docs tree overview
│  │  │  │        └─ [slug]/
│  │  │  │           └─ page.tsx   # MDX editor/viewer
│  │  │  └─ settings/
│  │  │     └─ page.tsx            # tenant / account settings
│  │  │
│  │  ├─ (public-docs)/
│  │  │  └─ [tenant]/[projectSlug]/[...docSlug]/
│  │  │     └─ page.tsx            # public docs viewer
│  │  │
│  │  ├─ api/
│  │  │  ├─ auth/
│  │  │  │  └─ [...nextauth]/route.ts   # NextAuth.js
│  │  │  ├─ docs/
│  │  │  │  ├─ index/route.ts          # list/create docs
│  │  │  │  └─ [docId]/route.ts        # update/delete doc
│  │  │  ├─ search/
│  │  │  │  └─ route.ts                # search endpoint (MiniSearch/Lunr/Meilisearch)
│  │  │  ├─ analytics/
│  │  │  │  ├─ events/route.ts         # track events
│  │  │  │  └─ summary/route.ts        # aggregated analytics
│  │  │  └─ tenants/
│  │  │     └─ route.ts
│  │  │
│  │  ├─ layout.tsx
│  │  └─ page.tsx                      # can redirect to (marketing) or dashboard
│  │
│  ├─ components/
│  │  ├─ ui/                           # shadcn/ui components (auto-generated)
│  │  ├─ blocks/                       # shadcn/ui Blocks, customized
│  │  │  ├─ marketing/
│  │  │  │  ├─ hero.tsx
│  │  │  │  ├─ pricing.tsx
│  │  │  │  └─ footer.tsx
│  │  │  ├─ dashboard/
│  │  │  │  ├─ sidebar.tsx
│  │  │  │  ├─ header.tsx
│  │  │  │  └─ stats-cards.tsx
│  │  │  └─ docs/
│  │  │     ├─ docs-layout.tsx
│  │  │     ├─ docs-sidebar.tsx
│  │  │     └─ toc.tsx
│  │  ├─ forms/
│  │  │  ├─ form.tsx
│  │  │  └─ text-field.tsx
│  │  ├─ charts/
│  │  │  └─ traffic-chart.tsx
│  │  └─ common/
│  │     ├─ logo.tsx
│  │     ├─ theme-toggle.tsx
│  │     └─ user-menu.tsx
│  │
│  ├─ features/
│  │  ├─ auth/
│  │  │  ├─ actions.ts                # server actions related to auth
│  │  │  └─ helpers.ts
│  │  ├─ tenants/
│  │  │  ├─ actions.ts
│  │  │  └─ queries.ts
│  │  ├─ docs/
│  │  │  ├─ actions.ts                # create/update docs (server)
│  │  │  ├─ queries.ts                # list/fetch docs
│  │  │  └─ mdx/
│  │  │     ├─ parse.ts               # MDX parsing helpers
│  │  │     └─ serialize.ts
│  │  └─ analytics/
│  │     ├─ actions.ts
│  │     └─ queries.ts
│  │
│  ├─ lib/
│  │  ├─ auth.ts                      # NextAuth config helpers
│  │  ├─ db.ts                        # Prisma client singleton
│  │  ├─ multitenancy.ts              # tenant resolution, org scoping
│  │  ├─ validation/
│  │  │  ├─ docs-schemas.ts          # Zod schemas
│  │  │  └─ tenant-schemas.ts
│  │  ├─ search/
│  │  │  ├─ minisearch.ts            # MiniSearch setup
│  │  │  └─ meilisearch.ts           # Meilisearch client + helpers (optional, self-hosted)
│  │  ├─ analytics/
│  │  │  └─ tracker.ts               # client helpers to send events
│  │  └─ utils.ts
│  │
│  ├─ hooks/
│  │  ├─ use-auth.ts
│  │  ├─ use-tenant.ts
│  │  ├─ use-search.ts
│  │  └─ use-analytics.ts
│  │
│  ├─ styles/
│  │  ├─ globals.css
│  │  └─ tailwind.css                # if separated
│  │
│  ├─ config/
│  │  ├─ site.ts                     # app name, URLs, etc.
│  │  ├─ analytics.ts
│  │  └─ search.ts
│  │
│  └─ types/
│     ├─ next-auth.d.ts              # module augmentation
│     ├─ docs.ts
│     └─ tenant.ts
│
├─ public/
│  ├─ favicon.ico
│  └─ logos/
├─ .env
├─ .env.example
├─ next.config.mjs
├─ tailwind.config.ts
├─ postcss.config.mjs
├─ package.json
└─ tsconfig.json


4.1 Route Groups (App Router)

app/(marketing)/...

Landing page, pricing, marketing sections.

app/(auth)/...

Sign-in, sign-up, reset password.

app/(dashboard)/...

Tenant dashboard, project view, editor, analytics, settings.

app/(public-docs)/[tenant]/[projectSlug]/[...docSlug]/page.tsx

Public documentation routes.

4.2 API Route Handlers

Under app/api/...:

auth/[...nextauth]/route.ts – NextAuth handler

docs/index/route.ts – docs listing, creation

docs/[docId]/route.ts – doc detail, update, delete

search/route.ts – search endpoint (wrapping MiniSearch/Lunr/Meilisearch)

analytics/events/route.ts – event ingestion

analytics/summary/route.ts – aggregated analytics

tenants/route.ts – tenant creation, updates

4.3 Features Layer

Under src/features/:

auth/

actions.ts – server actions (e.g. profile updates, sign-out helpers).

helpers.ts – helper functions related to auth.

tenants/

actions.ts – create/update tenants.

queries.ts – fetch tenant information for dashboards.

docs/

actions.ts – CRUD operations for docs (server-side).

queries.ts – listing/fetching docs.

mdx/ – MDX parse & serialize helpers.

analytics/

actions.ts – event writes, aggregations.

queries.ts – analytics summaries.

This pattern keeps business logic isolated from routes and UI.

5. shadcn/ui & Blocks Usage
5.1 Components Folder

src/components/ui/

Contains all shadcn-generated components (via CLI).

src/components/blocks/

Contains shadcn Blocks, customized for DokuNote.

Example grouping:

blocks/marketing/

hero.tsx, pricing.tsx, footer.tsx, etc.

blocks/dashboard/

sidebar.tsx, header.tsx, stats-cards.tsx, etc.

blocks/docs/

docs-layout.tsx, docs-sidebar.tsx, toc.tsx, etc.

5.2 Blocks Integration Rules

Blocks are treated as source, not external packages.

On adding a Block:

Paste from ui.shadcn.com/blocks.

Move into appropriate folder under components/blocks/.

Adjust Tailwind spacing and typography to match “compact, modern” style.

Replace static text with dynamic data / props.

6. Logging Strategy
6.1 Enhanced Logger Implementation

Logger Library: pino

Location: src/lib/logger.ts

Enhanced logging with request tracking and structured context:

```typescript
// lib/logger.ts
interface LogContext {
  userId?: string;
  tenantId?: string;
  requestId: string;
  userAgent?: string;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => ({ ...object, timestamp: new Date().toISOString() })
  }
});

// Request tracking middleware
export function withRequestLogging(handler: Function) {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();
    
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent')
    }, 'Request started');
    
    try {
      const response = await handler(req);
      logger.info({
        requestId,
        duration: Date.now() - start,
        status: response.status
      }, 'Request completed');
      return response;
    } catch (error) {
      logger.error({
        requestId,
        duration: Date.now() - start,
        error: error.message,
        stack: error.stack
      }, 'Request failed');
      throw error;
    }
  };
}
```

Behavior:

Development: pretty, colored logs via pino-pretty.

Production: structured JSON logs (stdout).

6.2 Places to Log

Route Handlers:

Log incoming requests with key metadata.

Log errors with context (user/tenant where appropriate).

Use withRequestLogging middleware for automatic request tracking.

Server Actions (in features/**/actions.ts):

Log important operations (create/update tenant, project, doc).

Include tenantId and userId in all logs for security auditing.

Prisma Integration:

Configure Prisma logs in src/lib/db.ts.

Forward Prisma warnings/errors to logger.

Examples:

Log for debugging:

logger.info({ tenantId, userId, requestId }, "Fetching docs")

Log on error:

logger.error({ error, docId, tenantId, userId, requestId }, "Error updating document")

6.3 Error Handling & Monitoring

Error Storage:

Log errors to PostgreSQL via pino logger (free, no external services).

Create error dashboard endpoint for viewing errors.

Optional upgrade: Self-host GlitchTip (open source Sentry alternative) if advanced error tracking needed.

6.4 Deployment Logging

In Docker: read logs via docker logs <container>.

In systemd: journalctl -u dokunote.

Future: integrate with centralized logging (Loki/Grafana, ELK, etc.) if needed.

6.5 Rate Limiting & Security

Memory-based rate limiting for MVP (upgrade to Redis later if needed):

```typescript
// lib/rate-limit.ts
const rateLimits = new Map();

export function rateLimit(identifier: string, limit: number, window: number) {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - window;
  
  // Clean old entries
  const requests = rateLimits.get(key) || [];
  const validRequests = requests.filter((time: number) => time > windowStart);
  
  if (validRequests.length >= limit) {
    return false; // Rate limited
  }
  
  validRequests.push(now);
  rateLimits.set(key, validRequests);
  return true; // Allowed
}

// Usage in middleware
export function withRateLimit(identifier: string, limit = 100, window = 60000) {
  return (handler: Function) => async (req: Request) => {
    if (!rateLimit(identifier, limit, window)) {
      return new Response('Rate limited', { status: 429 });
    }
    return handler(req);
  };
}
```

Apply rate limiting to:

- API endpoints (100 requests/minute per IP)
- Search endpoints (10 requests/minute per user)
- Authentication endpoints (5 attempts/minute per IP)

7. Responsiveness & Design Principles
7.1 General Responsive Strategy

Mobile-first:

Start layouts with simple mobile column design.

Enhance using Tailwind breakpoints (md:, lg:).

Compact but modern design:

Use smaller font sizes and tighter spacing than a typical marketing site.

Avoid giant paddings and oversized components.

7.2 Layout Patterns

Dashboard Layout:

Mobile:

No fixed sidebar.

Top header with hamburger that opens a Sheet/Drawer for navigation.

Desktop:

flex layout with a visible sidebar (md:flex-row).

Sidebar width fixed (w-60 or compact icon-only variant).

Docs Layout:

Centered content with max-w-3xl or max-w-4xl.

Sidebar for navigation on md+, collapsed into menu on mobile.

7.3 Typography & Spacing

Base body text:

text-sm on small screens, text-base on md+ in docs.

Heading sizes:

A bit smaller than typical marketing pages (e.g. text-3xl instead of text-5xl).

Spacing:

Default vertical spacing: space-y-3 / gap-3.

Larger space-y-6+ only for marketing hero & key sections.

Cards & components:

Use rounded-lg and subtle borders for a modern but professional look.

7.4 Tables & Data

Use ScrollArea around tables for mobile:

Avoid over-compressing columns.

Use text-sm and smaller paddings:

e.g. [&_th]:py-2 [&_td]:py-1.5.

8. Multi-Tenancy Principles

Each authenticated user is always associated with a current tenant (organization).

Tenant resolution can be done via:

Subdomain (future option), or

DB relationship and active tenant selection in the dashboard.

Docs, projects, analytics, and settings are scoped by tenant.

Implementation guideline:

src/lib/multitenancy.ts:

Helper to resolve current tenant ID from session.

Enhanced security middleware for tenant isolation.

Server actions and queries:

Always accept tenantId as context or derive it from the session.

Never operate on unscoped data.

8.1 Enhanced Multi-Tenancy Security

Critical security functions for tenant isolation:

```typescript
// lib/multitenancy.ts
export async function requireTenant(tenantId: string, userId: string) {
  const access = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } }
  });
  if (!access) throw new Error('Unauthorized tenant access');
  return access;
}

// Middleware for tenant validation
export function withTenantAuth(handler: Function) {
  return async (req: Request) => {
    const tenantId = req.headers.get('x-tenant-id');
    const session = await getSession();
    await requireTenant(tenantId, session.user.id);
    return handler(req);
  };
}
```

8.2 Database Security & Performance

Required indexes for tenant isolation and performance:

```sql
-- Add to Prisma schema
@@index([tenantId, projectId])  // on Document
@@index([tenantId, createdAt])  // on AnalyticsEvent  
@@index([tenantId, userId])     // on UserTenant
@@index([tenantId, slug])       // on Project
```

9. Search Strategy

MVP:

Use MiniSearch or Lunr.js.

Index docs per project.

Index built server-side and exposed via endpoint or embedded in client for the project.

Upgrade Path:

Abstract search functionality behind lib/search/*.

Swap implementation to self-hosted Meilisearch when needed (free, runs on same server).

10. Analytics Strategy

Capture basic events:

Page views for public docs.

Search queries.

404 / not-found page hits for missing docs.

Storage:

Events table in PostgreSQL.

Periodic or on-demand aggregation for dashboard views.

Visualization:

Stats cards and charts in the dashboard using shadcn + chart components in components/charts/.

11. CI/CD & Environment Management

CI/CD: GitHub Actions

Linting, type-checking, tests.

Build and deployment to Hetzner (via SSH or container registry).

Environment Files:

.env (local dev)

.env.example (template)

Secrets:

Stored in GitHub Actions secrets & server environment variables.

12. Production Infrastructure & Backup Strategy

12.1 Enhanced Backup Strategy

```bash
#!/bin/bash
# scripts/backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgresql"
DB_NAME="dokunote"

mkdir -p $BACKUP_DIR

# Create backup with compression
pg_dump $DB_NAME | gzip > $BACKUP_DIR/dokunote_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "dokunote_*.sql.gz" -mtime +30 -delete

# Optional: Upload to cloud storage
# aws s3 cp $BACKUP_DIR/dokunote_$DATE.sql.gz s3://dokunote-backups/
```

Schedule via crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh
```

12.2 Performance Optimization Guidelines

Document indexing strategy:
```typescript
// Phase 1: Simple client-side search
// Phase 2: Server-side indexing with pagination
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
```

Caching strategy:
- Static assets: CDN or Nginx caching
- Database queries: Redis (optional upgrade)
- Search indexes: Memory-based for MVP

13. MVP vs Full Version Timeline

13.1 True MVP (6-8 weeks)
Focus on core value proposition:
- User registration/authentication (NextAuth.js)
- Basic document creation/editing (simple markdown editor)
- Multi-tenant project organization
- Public documentation publishing
- Basic search (MiniSearch client-side)

13.2 Full Version (16 weeks)
Complete feature set as outlined in development plan:
- Advanced MDX editor
- Analytics dashboard
- Marketing site
- Advanced search (Meilisearch)
- Comprehensive testing
- Security hardening

14. Non-Goals for the MVP

These are explicitly out of scope for the 6-week MVP, but can be added later:

Full-blown billing & subscription engine.

Custom domains for each tenant (e.g. docs.company.com).

Complex role-based permissions beyond basic roles (Owner, Admin, Editor, Viewer).

Real-time collaborative editing (Google Docs style).

Complex workflow/approval systems.

Advanced analytics and reporting.

Marketing site and complex onboarding flows.

15. Summary

DokuNote is built as a single-stack, TypeScript-first Next.js app with:

Next.js + MDX for content and routing.

shadcn/ui + Blocks + Tailwind for modern, compact UI.

Prisma + PostgreSQL for robust data storage.

NextAuth + multi-tenancy for secure, multi-tenant access.

Route Handlers + Server Actions for clean server logic.

Structured logging and clear responsiveness rules baked in from day one.