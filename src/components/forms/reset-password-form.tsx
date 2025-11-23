'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;

    try {
      // TODO: Implement password reset email sending
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Password reset instructions have been sent to ${email}`);
      
      toast({
        title: 'Reset email sent',
        description: 'Check your email for password reset instructions.',
      });

    } catch (error) {
      setError('Failed to send reset email. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent className="spacing-compact">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="spacing-compact">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Mail className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset email...
                </>
              ) : (
                'Send reset email'
              )}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/auth/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to sign in
          </Link>
        </div>

        {!success && (
          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link
              href="/auth/sign-up"
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
