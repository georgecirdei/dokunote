import { db } from '@/lib/db';
import { createTenantDB } from '@/lib/multitenancy';
import { ContextLogger } from '@/lib/logger';

/**
 * Tenant isolation security tests
 * Validates that tenant data cannot leak between organizations
 */

interface SecurityTestResult {
  testName: string;
  passed: boolean;
  details?: string;
  error?: string;
}

interface SecurityTestSuite {
  suiteName: string;
  results: SecurityTestResult[];
  overallPassed: boolean;
  duration: number;
  executedAt: Date;
}

export class TenantIsolationTester {
  private logger: ContextLogger;
  
  constructor() {
    this.logger = new ContextLogger({ 
      requestId: 'security-test',
    });
  }

  /**
   * Run complete tenant isolation test suite
   */
  async runTestSuite(
    tenant1Id: string, 
    tenant2Id: string, 
    user1Id: string, 
    user2Id: string
  ): Promise<SecurityTestSuite> {
    const start = Date.now();
    
    this.logger.info('Starting tenant isolation test suite', {
      tenant1Id,
      tenant2Id,
      user1Id,
      user2Id,
    });

    const results: SecurityTestResult[] = [];

    // Test 1: Tenant-scoped project queries
    results.push(await this.testProjectIsolation(tenant1Id, tenant2Id, user1Id, user2Id));
    
    // Test 2: Tenant-scoped document queries
    results.push(await this.testDocumentIsolation(tenant1Id, tenant2Id, user1Id, user2Id));
    
    // Test 3: Analytics event isolation
    results.push(await this.testAnalyticsIsolation(tenant1Id, tenant2Id));
    
    // Test 4: User-tenant relationship validation
    results.push(await this.testUserTenantIsolation(tenant1Id, tenant2Id, user1Id, user2Id));
    
    // Test 5: Cross-tenant access attempts
    results.push(await this.testCrossTenantAccess(tenant1Id, tenant2Id, user1Id, user2Id));

    const duration = Date.now() - start;
    const overallPassed = results.every(result => result.passed);

    const suite: SecurityTestSuite = {
      suiteName: 'Tenant Isolation Security Tests',
      results,
      overallPassed,
      duration,
      executedAt: new Date(),
    };

    this.logger.info('Tenant isolation test suite completed', {
      overallPassed,
      passedTests: results.filter(r => r.passed).length,
      totalTests: results.length,
      duration,
    });

    return suite;
  }

  /**
   * Test 1: Project isolation between tenants
   */
  private async testProjectIsolation(
    tenant1Id: string,
    tenant2Id: string,
    user1Id: string,
    user2Id: string
  ): Promise<SecurityTestResult> {
    try {
      // Create test projects in each tenant
      const tenant1DB = createTenantDB(tenant1Id, user1Id);
      const tenant2DB = createTenantDB(tenant2Id, user2Id);

      const project1 = await tenant1DB.projects.create({
        data: {
          name: 'Tenant 1 Test Project',
          slug: 'tenant-1-test',
          description: 'Project for tenant isolation testing',
        },
      });

      const project2 = await tenant2DB.projects.create({
        data: {
          name: 'Tenant 2 Test Project',
          slug: 'tenant-2-test',
          description: 'Project for tenant isolation testing',
        },
      });

      // Test: Tenant1DB should not see Tenant2's project
      const tenant1Projects = await tenant1DB.projects.findMany({});
      const tenant2Projects = await tenant2DB.projects.findMany({});

      const tenant1SeesTenant2Project = tenant1Projects.some(p => p.id === project2.id);
      const tenant2SeesTenant1Project = tenant2Projects.some(p => p.id === project1.id);

      // Cleanup
      await tenant1DB.projects.delete({ where: { id: project1.id } });
      await tenant2DB.projects.delete({ where: { id: project2.id } });

      if (tenant1SeesTenant2Project || tenant2SeesTenant1Project) {
        return {
          testName: 'Project Isolation',
          passed: false,
          details: 'Projects leaked between tenants',
        };
      }

      return {
        testName: 'Project Isolation',
        passed: true,
        details: 'Projects correctly isolated between tenants',
      };

    } catch (error) {
      return {
        testName: 'Project Isolation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test 2: Document isolation between tenants
   */
  private async testDocumentIsolation(
    tenant1Id: string,
    tenant2Id: string,
    user1Id: string,
    user2Id: string
  ): Promise<SecurityTestResult> {
    try {
      const tenant1DB = createTenantDB(tenant1Id, user1Id);
      const tenant2DB = createTenantDB(tenant2Id, user2Id);

      // Create test projects first
      const project1 = await tenant1DB.projects.create({
        data: {
          name: 'Doc Test Project 1',
          slug: 'doc-test-1',
        },
      });

      const project2 = await tenant2DB.projects.create({
        data: {
          name: 'Doc Test Project 2',
          slug: 'doc-test-2',
        },
      });

      // Create test documents
      const doc1 = await tenant1DB.documents.create({
        data: {
          projectId: project1.id,
          authorId: user1Id,
          title: 'Tenant 1 Document',
          slug: 'tenant-1-doc',
          content: 'This is content for tenant 1',
        },
      });

      const doc2 = await tenant2DB.documents.create({
        data: {
          projectId: project2.id,
          authorId: user2Id,
          title: 'Tenant 2 Document',
          slug: 'tenant-2-doc',
          content: 'This is content for tenant 2',
        },
      });

      // Test isolation
      const tenant1Docs = await tenant1DB.documents.findMany({});
      const tenant2Docs = await tenant2DB.documents.findMany({});

      const tenant1SeesTenant2Doc = tenant1Docs.some(d => d.id === doc2.id);
      const tenant2SeesTenant1Doc = tenant2Docs.some(d => d.id === doc1.id);

      // Cleanup
      await tenant1DB.documents.delete({ where: { id: doc1.id } });
      await tenant2DB.documents.delete({ where: { id: doc2.id } });
      await tenant1DB.projects.delete({ where: { id: project1.id } });
      await tenant2DB.projects.delete({ where: { id: project2.id } });

      if (tenant1SeesTenant2Doc || tenant2SeesTenant1Doc) {
        return {
          testName: 'Document Isolation',
          passed: false,
          details: 'Documents leaked between tenants',
        };
      }

      return {
        testName: 'Document Isolation',
        passed: true,
        details: 'Documents correctly isolated between tenants',
      };

    } catch (error) {
      return {
        testName: 'Document Isolation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test 3: Analytics event isolation
   */
  private async testAnalyticsIsolation(
    tenant1Id: string,
    tenant2Id: string
  ): Promise<SecurityTestResult> {
    try {
      const tenant1DB = createTenantDB(tenant1Id);
      const tenant2DB = createTenantDB(tenant2Id);

      // Create test events
      const event1 = await tenant1DB.events.create({
        data: {
          type: 'test_event_1',
          data: { test: 'tenant1' },
        },
      });

      const event2 = await tenant2DB.events.create({
        data: {
          type: 'test_event_2',
          data: { test: 'tenant2' },
        },
      });

      // Test isolation
      const tenant1Events = await tenant1DB.events.findMany({
        where: { type: { startsWith: 'test_event' } },
      });

      const tenant2Events = await tenant2DB.events.findMany({
        where: { type: { startsWith: 'test_event' } },
      });

      const tenant1SeesTenant2Event = tenant1Events.some(e => e.id === event2.id);
      const tenant2SeesTenant1Event = tenant2Events.some(e => e.id === event1.id);

      if (tenant1SeesTenant2Event || tenant2SeesTenant1Event) {
        return {
          testName: 'Analytics Isolation',
          passed: false,
          details: 'Analytics events leaked between tenants',
        };
      }

      return {
        testName: 'Analytics Isolation',
        passed: true,
        details: 'Analytics events correctly isolated between tenants',
      };

    } catch (error) {
      return {
        testName: 'Analytics Isolation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test 4: User-tenant relationship validation
   */
  private async testUserTenantIsolation(
    tenant1Id: string,
    tenant2Id: string,
    user1Id: string,
    user2Id: string
  ): Promise<SecurityTestResult> {
    try {
      // User1 should only have access to Tenant1
      const user1Tenant1Access = await db.userTenant.findUnique({
        where: {
          userId_tenantId: { userId: user1Id, tenantId: tenant1Id },
          isActive: true,
        },
      });

      const user1Tenant2Access = await db.userTenant.findUnique({
        where: {
          userId_tenantId: { userId: user1Id, tenantId: tenant2Id },
          isActive: true,
        },
      });

      // User2 should only have access to Tenant2
      const user2Tenant1Access = await db.userTenant.findUnique({
        where: {
          userId_tenantId: { userId: user2Id, tenantId: tenant1Id },
          isActive: true,
        },
      });

      const user2Tenant2Access = await db.userTenant.findUnique({
        where: {
          userId_tenantId: { userId: user2Id, tenantId: tenant2Id },
          isActive: true,
        },
      });

      if (!user1Tenant1Access || user1Tenant2Access || user2Tenant1Access || !user2Tenant2Access) {
        return {
          testName: 'User-Tenant Relationship Isolation',
          passed: false,
          details: 'Incorrect user-tenant relationships found',
        };
      }

      return {
        testName: 'User-Tenant Relationship Isolation',
        passed: true,
        details: 'User-tenant relationships correctly isolated',
      };

    } catch (error) {
      return {
        testName: 'User-Tenant Relationship Isolation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test 5: Cross-tenant access attempts
   */
  private async testCrossTenantAccess(
    tenant1Id: string,
    tenant2Id: string,
    user1Id: string,
    user2Id: string
  ): Promise<SecurityTestResult> {
    try {
      let accessDeniedCount = 0;

      // Test 1: User1 tries to access Tenant2 projects
      try {
        const tenant2DB = createTenantDB(tenant2Id, user1Id); // Wrong user for tenant2
        await tenant2DB.projects.findMany({});
        // If this succeeds, it's a security issue
      } catch (error) {
        accessDeniedCount++;
      }

      // Test 2: User2 tries to access Tenant1 projects  
      try {
        const tenant1DB = createTenantDB(tenant1Id, user2Id); // Wrong user for tenant1
        await tenant1DB.projects.findMany({});
        // If this succeeds, it's a security issue
      } catch (error) {
        accessDeniedCount++;
      }

      // Test 3: Validate requireTenant function blocks unauthorized access
      try {
        const { requireTenant } = await import('@/lib/db');
        await requireTenant(tenant1Id, user2Id); // User2 should not have access to Tenant1
        // If this succeeds, it's a security issue
      } catch (error) {
        accessDeniedCount++;
      }

      try {
        const { requireTenant } = await import('@/lib/db');
        await requireTenant(tenant2Id, user1Id); // User1 should not have access to Tenant2
        // If this succeeds, it's a security issue
      } catch (error) {
        accessDeniedCount++;
      }

      if (accessDeniedCount === 4) {
        return {
          testName: 'Cross-Tenant Access Prevention',
          passed: true,
          details: 'All unauthorized access attempts were correctly blocked',
        };
      } else {
        return {
          testName: 'Cross-Tenant Access Prevention',
          passed: false,
          details: `Only ${accessDeniedCount}/4 unauthorized access attempts were blocked`,
        };
      }

    } catch (error) {
      return {
        testName: 'Cross-Tenant Access Prevention',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run performance test to ensure tenant scoping doesn't impact performance
   */
  async runPerformanceTest(tenantId: string, userId: string): Promise<SecurityTestResult> {
    try {
      const tenantDB = createTenantDB(tenantId, userId);
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await tenantDB.projects.findMany({
          take: 10,
        });
        times.push(Date.now() - start);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      // Performance should be under 100ms average, 500ms max for scoped queries
      if (averageTime < 100 && maxTime < 500) {
        return {
          testName: 'Tenant Scoping Performance',
          passed: true,
          details: `Average: ${averageTime.toFixed(2)}ms, Max: ${maxTime}ms`,
        };
      } else {
        return {
          testName: 'Tenant Scoping Performance',
          passed: false,
          details: `Performance degraded - Average: ${averageTime.toFixed(2)}ms, Max: ${maxTime}ms`,
        };
      }

    } catch (error) {
      return {
        testName: 'Tenant Scoping Performance',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate database indexes are properly configured
   */
  async validateDatabaseIndexes(): Promise<SecurityTestResult> {
    try {
      // Check if tenant-scoped indexes exist by running EXPLAIN on key queries
      const queries = [
        `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "documents" WHERE "tenantId" = 'test' AND "projectId" = 'test'`,
        `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "analytics_events" WHERE "tenantId" = 'test' AND "createdAt" > NOW() - INTERVAL '7 days'`,
        `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "user_tenants" WHERE "tenantId" = 'test' AND "userId" = 'test'`,
      ];

      const results = await Promise.all(
        queries.map(async (query) => {
          try {
            const result = await db.$queryRawUnsafe(query);
            return { query, success: true, result };
          } catch (error) {
            return { query, success: false, error };
          }
        })
      );

      const failedQueries = results.filter(r => !r.success);

      if (failedQueries.length === 0) {
        return {
          testName: 'Database Index Validation',
          passed: true,
          details: 'All tenant-scoped queries can be explained successfully',
        };
      } else {
        return {
          testName: 'Database Index Validation',
          passed: false,
          details: `${failedQueries.length} queries failed to explain`,
        };
      }

    } catch (error) {
      return {
        testName: 'Database Index Validation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * API endpoint for running security tests
 */
export async function runSecurityTestSuite(): Promise<SecurityTestSuite> {
  const tester = new TenantIsolationTester();
  
  // Get two test tenants and users for testing
  const testData = await db.$transaction(async (tx) => {
    // Find or create test tenants
    const tenants = await tx.tenant.findMany({
      where: { 
        slug: { in: ['test-tenant-1', 'test-tenant-2'] },
        isActive: true,
      },
      take: 2,
    });

    if (tenants.length < 2) {
      throw new Error('Need at least 2 tenants for isolation testing');
    }

    // Find users for each tenant
    const tenant1Users = await tx.userTenant.findMany({
      where: { tenantId: tenants[0].id, isActive: true },
      take: 1,
    });

    const tenant2Users = await tx.userTenant.findMany({
      where: { tenantId: tenants[1].id, isActive: true },
      take: 1,
    });

    if (tenant1Users.length === 0 || tenant2Users.length === 0) {
      throw new Error('Need users in both tenants for testing');
    }

    return {
      tenant1Id: tenants[0].id,
      tenant2Id: tenants[1].id,
      user1Id: tenant1Users[0].userId,
      user2Id: tenant2Users[0].userId,
    };
  });

  return await tester.runTestSuite(
    testData.tenant1Id,
    testData.tenant2Id,
    testData.user1Id,
    testData.user2Id
  );
}

export default TenantIsolationTester;
