'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Github, Mail, Eye, EyeOff, Building } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { registerUser } from '@/features/auth/actions';

export function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createOrg, setCreateOrg] = useState(false);
  
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await registerUser(formData);

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess(result.message);
      toast({
        title: 'Account created!',
        description: 'Your account has been created successfully. You can now sign in.',
      });

      // Redirect to sign in after a short delay
      setTimeout(() => {
        window.location.href = '/auth/sign-in';
      }, 2000);

    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGitHubSignUp() {
    setIsLoading(true);
    try {
      await signIn('github', {
        callbackUrl: '/dashboard',
      });
    } catch (error) {
      setError('GitHub sign up failed. Please try again.');
      console.error('GitHub sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Get started with DokuNote and create beautiful documentation for your team
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

        {/* OAuth Providers */}
        <div className="grid gap-3">
          {process.env.NEXT_PUBLIC_GITHUB_ENABLED && (
            <Button
              variant="outline"
              onClick={handleGitHubSignUp}
              disabled={isLoading}
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              Sign up with GitHub
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
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              required
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                required
                disabled={isLoading}
                autoComplete="new-password"
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
            <p className="text-xs text-muted-foreground">
              Must contain at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          {/* Optional Organization */}
          <div className="grid gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createOrg"
                checked={createOrg}
                onCheckedChange={(checked) => setCreateOrg(checked === true)}
              />
              <Label htmlFor="createOrg" className="text-sm">
                Create an organization workspace
              </Label>
            </div>

            {createOrg && (
              <div className="grid gap-2">
                <Label htmlFor="tenantName">
                  <Building className="inline-block w-4 h-4 mr-1" />
                  Organization Name
                </Label>
                <Input
                  id="tenantName"
                  name="tenantName"
                  type="text"
                  placeholder="ACME Corporation"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Create a shared workspace for your team. 
                  You can always create one later.
                </p>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Mail className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>

          <div className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-foreground hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-foreground hover:underline">
              Privacy Policy
            </Link>
          </div>
        </form>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link
            href="/auth/sign-in"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
