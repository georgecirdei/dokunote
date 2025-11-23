import { Logo } from '@/components/common/logo';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { redirectIfAuthenticated } from '@/features/auth/helpers';

/**
 * Authentication layout
 * Used for sign-in, sign-up, and password reset pages
 */

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect authenticated users to dashboard
  await redirectIfAuthenticated();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between h-16">
            <Logo />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container px-4 mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DokuNote. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
