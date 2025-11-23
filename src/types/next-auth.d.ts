import { DefaultSession, DefaultUser } from 'next-auth';

/**
 * Module augmentation for NextAuth.js
 * Extends the built-in session and user types
 */

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      currentTenantId?: string;
      currentTenantRole?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    currentTenantId?: string;
    currentTenantRole?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    currentTenantId?: string;
    currentTenantRole?: string;
  }
}
