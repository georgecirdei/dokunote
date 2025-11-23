import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Authentication Error - DokuNote',
  description: 'Authentication error occurred',
};

interface AuthErrorPageProps {
  searchParams: {
    error?: string;
  };
}

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An unexpected error occurred during authentication.',
};

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const error = searchParams.error || 'Default';
  const message = errorMessages[error] || errorMessages.Default;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-2xl">Authentication Error</CardTitle>
        <CardDescription>
          Something went wrong during the authentication process
        </CardDescription>
      </CardHeader>
      <CardContent className="spacing-compact">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>

        <div className="grid gap-3">
          <Button asChild className="w-full">
            <Link href="/auth/sign-in">
              Try signing in again
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              Go to homepage
            </Link>
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          If this problem persists, please{' '}
          <Link href="/contact" className="text-foreground hover:underline">
            contact our support team
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
