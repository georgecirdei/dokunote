'use client';

import { SessionProvider } from 'next-auth/react';

interface AuthProviderProps {
  children: React.ReactNode;
  session?: any;
}

/**
 * NextAuth session provider wrapper
 * Provides authentication context to all components
 */
export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
