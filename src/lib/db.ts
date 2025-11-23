import { PrismaClient } from '@prisma/client';

// Enhanced Prisma client with logging integration
const createPrismaClient = () => {
  const prisma = new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });

  // Forward Prisma logs to our logger (will be implemented in Phase 1.4)
  prisma.$on('error', (e) => {
    console.error('Prisma Error:', e);
  });

  prisma.$on('warn', (e) => {
    console.warn('Prisma Warning:', e);
  });

  prisma.$on('info', (e) => {
    console.info('Prisma Info:', e);
  });

  prisma.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Prisma Query:', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    }
  });

  return prisma;
};

// Global Prisma client singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Helper functions for enhanced multi-tenancy security
export async function requireTenant(tenantId: string, userId: string) {
  const access = await db.userTenant.findUnique({
    where: { 
      userId_tenantId: { 
        userId, 
        tenantId 
      },
      isActive: true 
    }
  });
  
  if (!access) {
    throw new Error('Unauthorized tenant access');
  }
  
  return access;
}

// Database health check
export async function healthCheck() {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date() 
    };
  }
}
