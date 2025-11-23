import type { Metadata } from 'next';
import { SignInForm } from '@/components/forms/sign-in-form';

export const metadata: Metadata = {
  title: 'Sign In - DokuNote',
  description: 'Sign in to your DokuNote account',
};

export default function SignInPage() {
  return <SignInForm />;
}
