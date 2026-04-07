import { redirect } from 'next/navigation';
import { getBackendSession } from '@/lib/auth/session';

export default async function RootPage() {
  const session = await getBackendSession();

  // If user is authenticated, redirect to appropriate dashboard
  if (session?.role === 'admin') {
    redirect('/admin/companies');
  }

  if (session?.role === 'company') {
    redirect('/company/office');
  }

  // If not authenticated, show landing page
  redirect('/home');
}
