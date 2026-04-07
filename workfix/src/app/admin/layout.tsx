import { type ReactNode } from "react";
import { requireAdminSession } from "./_lib/admin";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();

  return (
    <div className="flex min-h-screen bg-surface-0">
      <AdminSidebar fullName={session.fullName} email={session.email} />
      <main className="ml-[280px] flex-1">
        <div className="min-h-screen p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
