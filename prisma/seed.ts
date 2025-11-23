import { PrismaClient } from '@prisma/client';
import { generateTenantSlug } from '../src/lib/multitenancy';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'ACME Corporation',
      slug: 'acme-corp',
      subdomain: 'acme-corp',
      description: 'A sample corporation for testing DokuNote features',
      website: 'https://acme-corp.example.com',
      plan: 'pro',
      settings: {
        allowPublicSignup: false,
        requireEmailVerification: true,
        defaultUserRole: 'viewer',
        enableAnalytics: true,
        enablePublicDocs: true,
        primaryColor: '#0066CC',
      },
    },
  });
  
  console.log('✅ Created tenant:', tenant.name);

  // Create sample users
  const owner = await prisma.user.upsert({
    where: { email: 'owner@acme-corp.example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'owner@acme-corp.example.com',
      bio: 'CEO and founder of ACME Corporation',
      website: 'https://johndoe.example.com',
      location: 'San Francisco, CA',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme-corp.example.com' },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'admin@acme-corp.example.com',
      bio: 'Technical writer and documentation manager',
      location: 'New York, NY',
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: 'editor@acme-corp.example.com' },
    update: {},
    create: {
      name: 'Bob Johnson',
      email: 'editor@acme-corp.example.com',
      bio: 'Product manager and content creator',
      location: 'Austin, TX',
    },
  });

  console.log('✅ Created users:', [owner.name, admin.name, editor.name]);

  // Create user-tenant relationships
  await prisma.userTenant.upsert({
    where: { 
      userId_tenantId: { 
        userId: owner.id, 
        tenantId: tenant.id 
      }
    },
    update: {},
    create: {
      userId: owner.id,
      tenantId: tenant.id,
      role: 'owner',
      permissions: {
        canManageUsers: true,
        canManageSettings: true,
        canManageProjects: true,
        canManageBilling: true,
      },
    },
  });

  await prisma.userTenant.upsert({
    where: { 
      userId_tenantId: { 
        userId: admin.id, 
        tenantId: tenant.id 
      }
    },
    update: {},
    create: {
      userId: admin.id,
      tenantId: tenant.id,
      role: 'admin',
      permissions: {
        canManageUsers: true,
        canManageSettings: false,
        canManageProjects: true,
        canManageBilling: false,
      },
    },
  });

  await prisma.userTenant.upsert({
    where: { 
      userId_tenantId: { 
        userId: editor.id, 
        tenantId: tenant.id 
      }
    },
    update: {},
    create: {
      userId: editor.id,
      tenantId: tenant.id,
      role: 'editor',
      permissions: {
        canManageUsers: false,
        canManageSettings: false,
        canManageProjects: false,
        canManageBilling: false,
      },
    },
  });

  console.log('✅ Created user-tenant relationships');

  // Create sample projects
  const apiDocsProject = await prisma.project.upsert({
    where: { 
      tenantId_slug: { 
        tenantId: tenant.id, 
        slug: 'api-documentation' 
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'API Documentation',
      slug: 'api-documentation',
      description: 'Complete API reference and integration guides',
      isPublic: true,
      metaTitle: 'ACME Corp API Documentation',
      metaDescription: 'Complete API reference for ACME Corp services',
      primaryColor: '#0066CC',
      settings: {
        enableSearch: true,
        enableFeedback: true,
        showLastUpdated: true,
        enablePrintMode: true,
      },
    },
  });

  const userGuideProject = await prisma.project.upsert({
    where: { 
      tenantId_slug: { 
        tenantId: tenant.id, 
        slug: 'user-guide' 
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'User Guide',
      slug: 'user-guide',
      description: 'Step-by-step guides for end users',
      isPublic: true,
      metaTitle: 'ACME Corp User Guide',
      metaDescription: 'Learn how to use ACME Corp products effectively',
      primaryColor: '#0066CC',
      settings: {
        enableSearch: true,
        enableFeedback: true,
        showLastUpdated: true,
      },
    },
  });

  const internalDocsProject = await prisma.project.upsert({
    where: { 
      tenantId_slug: { 
        tenantId: tenant.id, 
        slug: 'internal-docs' 
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Internal Documentation',
      slug: 'internal-docs',
      description: 'Private documentation for internal team use',
      isPublic: false,
      metaTitle: 'ACME Corp Internal Docs',
      metaDescription: 'Internal processes and procedures',
      settings: {
        enableSearch: true,
        enableFeedback: false,
        showLastUpdated: true,
      },
    },
  });

  console.log('✅ Created projects:', [
    apiDocsProject.name, 
    userGuideProject.name, 
    internalDocsProject.name
  ]);

  // Create sample documents for API Documentation
  const gettingStartedDoc = await prisma.document.upsert({
    where: { 
      projectId_slug: { 
        projectId: apiDocsProject.id, 
        slug: 'getting-started' 
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: apiDocsProject.id,
      authorId: admin.id,
      title: 'Getting Started',
      slug: 'getting-started',
      content: `# Getting Started with ACME API

Welcome to the ACME Corporation API documentation. This guide will help you get started with integrating our services into your applications.

## Quick Start

1. **Get your API key** from the [developer console](https://console.acme-corp.example.com)
2. **Make your first request** using our REST API
3. **Explore our SDKs** for popular programming languages

## Authentication

All API requests must include your API key in the Authorization header:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.acme-corp.example.com/v1/users
\`\`\`

## Rate Limits

- **Free tier**: 1,000 requests per hour
- **Pro tier**: 10,000 requests per hour  
- **Enterprise**: Custom limits

## Support

Need help? Contact our developer support team at [api-support@acme-corp.example.com](mailto:api-support@acme-corp.example.com).`,
      excerpt: 'Learn how to get started with the ACME Corporation API',
      isPublished: true,
      isDraft: false,
      order: 1,
      keywords: ['api', 'getting-started', 'authentication', 'quickstart'],
      metaTitle: 'Getting Started - ACME API Documentation',
      metaDescription: 'Learn how to get started with the ACME Corporation API',
      publishedAt: new Date(),
    },
  });

  const authenticationDoc = await prisma.document.upsert({
    where: { 
      projectId_slug: { 
        projectId: apiDocsProject.id, 
        slug: 'authentication' 
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: apiDocsProject.id,
      authorId: admin.id,
      title: 'Authentication',
      slug: 'authentication',
      content: `# Authentication

The ACME API uses API keys for authentication. You can manage your API keys from the developer console.

## API Key Types

### Public Keys
- Used for client-side applications
- Limited to read-only operations
- Safe to include in frontend code

### Secret Keys  
- Used for server-side applications
- Full access to all API operations
- Must be kept secure and private

## Using API Keys

Include your API key in the Authorization header of your requests:

\`\`\`http
GET /v1/users HTTP/1.1
Host: api.acme-corp.example.com
Authorization: Bearer sk_live_abc123def456
Content-Type: application/json
\`\`\`

## Security Best Practices

1. **Never share your secret keys**
2. **Use environment variables** to store API keys
3. **Rotate keys regularly** (recommended every 90 days)
4. **Monitor usage** for unusual activity
5. **Use the minimum required permissions**

## Error Handling

Authentication errors return HTTP 401 with the following structure:

\`\`\`json
{
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key",
    "code": "invalid_api_key"
  }
}
\`\`\``,
      excerpt: 'Learn how to authenticate with the ACME API using API keys',
      isPublished: true,
      isDraft: false,
      order: 2,
      keywords: ['authentication', 'api-key', 'security', 'authorization'],
      metaTitle: 'Authentication - ACME API Documentation',
      metaDescription: 'Learn how to authenticate with the ACME API using API keys',
      publishedAt: new Date(),
    },
  });

  // Create a sample document for User Guide
  const installationDoc = await prisma.document.upsert({
    where: { 
      projectId_slug: { 
        projectId: userGuideProject.id, 
        slug: 'installation' 
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: userGuideProject.id,
      authorId: editor.id,
      title: 'Installation Guide',
      slug: 'installation',
      content: `# Installation Guide

This guide will walk you through installing the ACME software on your system.

## System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Memory**: 4 GB RAM minimum (8 GB recommended)
- **Storage**: 2 GB available disk space
- **Network**: Internet connection required for activation

## Windows Installation

1. Download the installer from [acme-corp.example.com/download](https://acme-corp.example.com/download)
2. Run the installer as Administrator
3. Follow the setup wizard
4. Restart your computer when prompted

## macOS Installation

1. Download the .dmg file
2. Open the disk image
3. Drag ACME to your Applications folder
4. Launch from Applications or Spotlight

## Linux Installation

### Ubuntu/Debian
\`\`\`bash
wget https://releases.acme-corp.example.com/linux/acme.deb
sudo dpkg -i acme.deb
sudo apt-get install -f
\`\`\`

### CentOS/RHEL
\`\`\`bash
wget https://releases.acme-corp.example.com/linux/acme.rpm
sudo rpm -ivh acme.rpm
\`\`\`

## Verification

To verify your installation:

\`\`\`bash
acme --version
\`\`\`

You should see output similar to:
\`\`\`
ACME Software v2.1.0
\`\`\`

## Next Steps

- [Configure your account](./configuration)
- [Take the guided tour](./getting-started)
- [Import your data](./data-import)`,
      excerpt: 'Step-by-step installation instructions for all supported platforms',
      isPublished: true,
      isDraft: false,
      order: 1,
      keywords: ['installation', 'setup', 'windows', 'macos', 'linux'],
      metaTitle: 'Installation Guide - ACME User Guide',
      metaDescription: 'Step-by-step installation instructions for ACME software',
      publishedAt: new Date(),
    },
  });

  console.log('✅ Created sample documents:', [
    gettingStartedDoc.title,
    authenticationDoc.title,
    installationDoc.title,
  ]);

  // Create some analytics events
  const events = [
    {
      tenantId: tenant.id,
      projectId: apiDocsProject.id,
      documentId: gettingStartedDoc.id,
      type: 'page_view',
      data: { path: '/getting-started', duration: 45 },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      country: 'US',
      device: 'desktop',
      browser: 'chrome',
    },
    {
      tenantId: tenant.id,
      projectId: apiDocsProject.id,
      type: 'search',
      data: { query: 'authentication', results: 5 },
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      country: 'CA',
      device: 'desktop',
      browser: 'safari',
    },
    {
      tenantId: tenant.id,
      projectId: userGuideProject.id,
      documentId: installationDoc.id,
      type: 'page_view',
      data: { path: '/installation', duration: 120 },
      ipAddress: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      country: 'GB',
      device: 'desktop',
      browser: 'firefox',
    },
  ];

  for (const eventData of events) {
    await prisma.analyticsEvent.create({ data: eventData });
  }

  console.log('✅ Created sample analytics events');

  // Create document versions
  await prisma.documentVersion.create({
    data: {
      documentId: gettingStartedDoc.id,
      authorId: admin.id,
      version: 1,
      title: gettingStartedDoc.title,
      content: gettingStartedDoc.content,
      changeNote: 'Initial version',
    },
  });

  console.log('✅ Created document versions');

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('Sample data created:');
  console.log('- Tenant: ACME Corporation (acme-corp.dokunote.com)');
  console.log('- Users: 3 users with different roles');
  console.log('- Projects: 3 projects (2 public, 1 private)');
  console.log('- Documents: 3 sample documents with content');
  console.log('- Analytics: Sample page views and search events');
  console.log('');
  console.log('You can now run: npm run dev');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
