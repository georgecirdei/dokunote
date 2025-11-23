import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/common/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ErrorTrackingProvider } from '@/components/providers/error-tracking-provider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'DokuNote - Enterprise Documentation Platform',
  description: 'Multi-tenant documentation platform built with Next.js',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ErrorTrackingProvider
              tenantId={session?.user?.currentTenantId}
              userId={session?.user?.id}
            >
              {children}
              <Toaster />
            </ErrorTrackingProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
