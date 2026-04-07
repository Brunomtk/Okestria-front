import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getBackendSession } from '@/lib/auth/session';

export default async function CompanyLayout({ children }: { children: ReactNode }) {
  const session = await getBackendSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,168,204,0.08),transparent_24%),#081019] text-white">
      {children}
    </div>
  );
}
