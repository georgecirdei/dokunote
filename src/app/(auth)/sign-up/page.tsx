import type { Metadata } from 'next';
import { SignUpForm } from '@/components/forms/sign-up-form';

export const metadata: Metadata = {
  title: 'Sign Up - DokuNote',
  description: 'Create your DokuNote account and start building beautiful documentation',
};

export default function SignUpPage() {
  return <SignUpForm />;
}
