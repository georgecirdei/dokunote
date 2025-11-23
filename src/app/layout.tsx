import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/common/theme-provider';
import { ErrorTrackingProvider } from '@/components/providers/error-tracking-provider';

export const metadata: Metadata = {
  title: 'DokuNote - Enterprise Documentation Platform',
  description: 'Multi-tenant documentation platform built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorTrackingProvider>
            {children}
            <Toaster />
          </ErrorTrackingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
