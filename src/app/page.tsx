import { redirect } from 'next/navigation';

export default function HomePage() {
  // For now, redirect to marketing page
  // Later this will handle authenticated vs unauthenticated users
  redirect('/');
}
