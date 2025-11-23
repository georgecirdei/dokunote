import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/forms/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password - DokuNote',
  description: 'Reset your DokuNote account password',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
