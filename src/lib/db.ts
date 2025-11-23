import { PrismaClient } from '@prisma/client';
import { ContextLogger, logDatabaseQuery } from './logger';

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

  const dbLogger = new ContextLogger({ requestId: 'db-init' });

  // Forward Prisma logs to our enhanced logger
  prisma.$on('error', (e) => {
    dbLogger.error('Database error occurred', new Error(e.message), {
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  prisma.$on('warn', (e) => {
    dbLogger.warn('Database warning', {
      message: e.message,
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  prisma.$on('info', (e) => {
    dbLogger.info('Database info', {
      message: e.message,
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  prisma.$on('query', (e) => {
    // Enhanced query logging with performance tracking
    logDatabaseQuery(e.query, JSON.parse(e.params), e.duration);
    
    // Log slow queries as warnings
    if (e.duration > 1000) { // Queries slower than 1 second
      dbLogger.warn('Slow database query detected', {
        query: e.query.slice(0, 200) + (e.query.length > 200 ? '...' : ''),
        duration: e.duration,
        params: e.params,
        timestamp: e.timestamp,
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

// Enhanced database health check with performance monitoring
export async function healthCheck() {
  const dbLogger = new ContextLogger({ requestId: 'health-check' });
  const start = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    dbLogger.info('Database health check completed', {
      responseTime,
      status: 'healthy',
    });

    return { 
      status: 'healthy', 
      responseTime,
      timestamp: new Date() 
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    
    dbLogger.error('Database health check failed', error, {
      responseTime,
      status: 'unhealthy',
    });

    return { 
      status: 'unhealthy', 
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date() 
    };
  }
}
