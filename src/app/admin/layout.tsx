import { type ReactNode } from "react";
import { requireAdminSession } from "./_lib/admin";
import { AdminSidebar } from "./AdminSidebar";

/**
 * v143 — Admin layout now lives on the same dark cosmic surface as
 * the rest of the brand (Cortex modal, OrkestriaLoader, login).
 * Two layered radial gradients give the page depth without any
 * particles or grids competing with the data UI on top.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#04060d] text-white">
      {/* Cosmic ambient layers, pinned to the viewport. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.18) 0%, rgba(15,23,42,0.92) 50%, #04060d 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 90% 35%, rgba(34,211,238,0.06), transparent 40%)," +
            "radial-gradient(circle at 22% 90%, rgba(245,158,11,0.05), transparent 45%)",
        }}
      />

      <AdminSidebar fullName={session.fullName} email={session.email} />

      <main className="relative z-10 ml-[280px] flex-1">
        <div className="min-h-screen px-6 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
