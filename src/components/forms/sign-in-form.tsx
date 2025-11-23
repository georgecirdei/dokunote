'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Github, Mail, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please check your credentials and try again.');
        return;
      }

      if (result?.ok) {
        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.',
        });
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGitHubSignIn() {
    setIsLoading(true);
    try {
      await signIn('github', {
        callbackUrl: '/dashboard',
      });
    } catch (error) {
      setError('GitHub sign in failed. Please try again.');
      console.error('GitHub sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to access your documentation workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="spacing-compact">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* OAuth Providers */}
        <div className="grid gap-3">
          {process.env.NEXT_PUBLIC_GITHUB_ENABLED && (
            <Button
              variant="outline"
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
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

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/reset-password"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">
                  {showPassword ? 'Hide password' : 'Show password'}
                </span>
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Mail className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          Don't have an account?{' '}
          <Link
            href="/auth/sign-up"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
