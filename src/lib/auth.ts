import { NextAuthOptions, Session, User } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import { compare } from 'bcryptjs';
import { JWT } from 'next-auth/jwt';

import { db } from './db';
import { ContextLogger, logAuthEvent } from './logger';
import { generateTenantSlug } from './multitenancy';

/**
 * NextAuth.js configuration with multi-tenant support
 * Implements secure authentication with tenant context integration
 */

const authLogger = new ContextLogger({ requestId: 'auth-system' });

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  
  // Configure session strategy
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Authentication providers
  providers: [
    // Credentials provider for email/password
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'your@email.com' 
        },
        password: { 
          label: 'Password', 
          type: 'password' 
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          authLogger.warn('Login attempt with missing credentials');
          return null;
        }

        try {
          // Find user by email
          const user = await db.user.findUnique({
            where: {
              email: credentials.email.toLowerCase(),
            },
            include: {
              userTenants: {
                where: { isActive: true },
                include: {
                  tenant: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          });

          if (!user) {
            authLogger.warn('Login attempt with non-existent email', {
              email: credentials.email,
            });
            return null;
          }

          // For users created via OAuth, they might not have a password
          if (!user.password) {
            authLogger.warn('Login attempt with OAuth-only account using credentials');
            return null;
          }

          // Verify password
          const isValidPassword = await compare(credentials.password, user.password);
          
          if (!isValidPassword) {
            authLogger.warn('Login attempt with invalid password', {
              userId: user.id,
              email: user.email,
            });
            return null;
          }

          // Update last login
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          // Log successful authentication
          logAuthEvent('login', user.id, true, {
            requestId: crypto.randomUUID(),
          });

          authLogger.info('User authenticated successfully', {
            userId: user.id,
            email: user.email,
            tenantCount: user.userTenants.length,
          });

          // Return user with tenant context
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            currentTenantId: user.userTenants[0]?.tenant.id,
            currentTenantRole: user.userTenants[0]?.role,
          };

        } catch (error) {
          authLogger.error('Authentication error', error, {
            email: credentials.email,
          });
          return null;
        }
      },
    }),

    // GitHub OAuth provider
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET 
      ? [GitHubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          profile(profile) {
            return {
              id: profile.id.toString(),
              name: profile.name || profile.login,
              email: profile.email,
              image: profile.avatar_url,
            };
          },
        })]
      : []
    ),
  ],

  // Custom pages
  pages: {
    signIn: '/auth/sign-in',
    error: '/auth/error',
  },

  // Callbacks for session and JWT customization
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.currentTenantId = user.currentTenantId;
        token.currentTenantRole = user.currentTenantRole;
        
        authLogger.info('JWT token created', {
          userId: user.id,
          currentTenantId: user.currentTenantId,
        });
      }

      // Update session (tenant switching)
      if (trigger === 'update' && session) {
        token.currentTenantId = session.user.currentTenantId;
        token.currentTenantRole = session.user.currentTenantRole;
        
        authLogger.info('JWT token updated', {
          userId: token.id,
          newTenantId: session.user.currentTenantId,
        });
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.currentTenantId = token.currentTenantId as string;
        session.user.currentTenantRole = token.currentTenantRole as string;
      }

      return session;
    },

    async signIn({ user, account, profile, email }) {
      try {
        // Allow sign in
        if (account?.provider === 'credentials') {
          return true; // Already validated in authorize function
        }

        // Handle OAuth sign in
        if (account?.provider === 'github' && user?.email) {
          // Check if user already exists
          const existingUser = await db.user.findUnique({
            where: { email: user.email },
            include: {
              userTenants: {
                where: { isActive: true },
                include: { tenant: true },
              },
            },
          });

          if (existingUser) {
            // Update last login
            await db.user.update({
              where: { id: existingUser.id },
              data: { lastLoginAt: new Date() },
            });

            logAuthEvent('login', existingUser.id, true, {
              requestId: crypto.randomUUID(),
            });

            return true;
          }

          // For new OAuth users, they'll be created by the adapter
          // We'll handle tenant assignment in the user creation process
          authLogger.info('New OAuth user will be created');

          return true;
        }

        return true;
      } catch (error) {
        authLogger.error('Sign in callback error', error, {
          provider: account?.provider,
          email: user?.email,
        });
        return false;
      }
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      
      return baseUrl;
    },
  },

  // Events for logging
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      logAuthEvent('login', user.id, true, {
        requestId: crypto.randomUUID(),
      });

      authLogger.info('User signed in', {
        userId: user.id,
        email: user.email,
        isNewUser,
      });

      // For new users, create a default personal tenant
      if (isNewUser && user.email) {
        try {
          await createPersonalTenant(user.id, user.name || user.email);
          authLogger.info('Personal tenant created for new user', {
            userId: user.id,
          });
        } catch (error) {
          authLogger.error('Failed to create personal tenant', error, {
            userId: user.id,
          });
        }
      }
    },

    async signOut({ token }) {
      if (token?.id) {
        logAuthEvent('logout', token.id as string, true, {
          requestId: crypto.randomUUID(),
        });

        authLogger.info('User signed out', {
          userId: token.id,
        });
      }
    },
  },

  // Security configuration
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error: (code, metadata) => {
      authLogger.error(`NextAuth error: ${code}`, undefined, metadata as Record<string, any>);
    },
    warn: (code) => {
      authLogger.warn(`NextAuth warning: ${code}`);
    },
    debug: (code, metadata) => {
      if (process.env.NODE_ENV === 'development') {
        authLogger.debug(`NextAuth debug: ${code}`, metadata as Record<string, any>);
      }
    },
  },
};

/**
 * Create a personal tenant for new users
 */
async function createPersonalTenant(userId: string, name: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) throw new Error('User not found');

  const tenantName = `${user.name || user.email}'s Workspace`;
  const tenantSlug = await generateTenantSlug(tenantName);

  // Create tenant
  const tenant = await db.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      subdomain: tenantSlug,
      description: 'Personal workspace',
      plan: 'free',
      settings: {
        allowPublicSignup: false,
        requireEmailVerification: true,
        defaultUserRole: 'viewer',
        enableAnalytics: true,
        enablePublicDocs: true,
      },
    },
  });

  // Add user as owner of the tenant
  await db.userTenant.create({
    data: {
      userId,
      tenantId: tenant.id,
      role: 'owner',
      permissions: {
        canManageUsers: true,
        canManageSettings: true,
        canManageProjects: true,
        canManageBilling: true,
        canDeleteTenant: true,
      },
    },
  });

  authLogger.info('Personal tenant created', {
    userId,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
  });

  return tenant;
}

/**
 * Helper to get current session with enhanced context
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { getSession } = await import('@/features/auth/helpers');
  return await getSession();
}

/**
 * Helper to get current user with tenant context
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  return session?.user || null;
}

/**
 * Helper to get current tenant context
 */
export async function getCurrentTenant() {
  const session = await getCurrentSession();
  
  if (!session?.user?.currentTenantId) {
    return null;
  }

  try {
    return await db.tenant.findUnique({
      where: { 
        id: session.user.currentTenantId,
        isActive: true,
      },
      include: {
        userTenants: {
          where: {
            userId: session.user.id,
            isActive: true,
          },
          select: {
            role: true,
            permissions: true,
          },
        },
      },
    });
  } catch (error) {
    authLogger.error('Failed to get current tenant', error, {
      userId: session.user.id,
      currentTenantId: session.user.currentTenantId,
    });
    return null;
  }
}

/**
 * Helper to check if user has permission in current tenant
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const tenant = await getCurrentTenant();
  
  if (!tenant?.userTenants?.[0]) {
    return false;
  }

  const userRole = tenant.userTenants[0].role;
  const userPermissions = tenant.userTenants[0].permissions as Record<string, boolean>;

  // Owner has all permissions
  if (userRole === 'owner') {
    return true;
  }

  // Check specific permission
  return userPermissions[permission] === true;
}

/**
 * Require authentication - throw error if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession();
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  return session;
}

/**
 * Require tenant access - throw error if no tenant access
 */
export async function requireTenantAccess(tenantId?: string) {
  const session = await requireAuth();
  const targetTenantId = tenantId || session.user.currentTenantId;
  
  if (!targetTenantId) {
    throw new Error('Tenant context required');
  }

  // Verify user has access to tenant
  const access = await db.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId: targetTenantId,
      },
      isActive: true,
    },
  });

  if (!access) {
    authLogger.warn('Unauthorized tenant access attempt', {
      userId: session.user.id,
      requestedTenantId: targetTenantId,
      currentTenantId: session.user.currentTenantId,
    });
    throw new Error('Unauthorized tenant access');
  }

  return { session, access };
}

export default authOptions;
