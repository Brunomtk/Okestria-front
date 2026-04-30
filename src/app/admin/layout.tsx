import { type ReactNode } from "react";
import { requireAdminSession } from "./_lib/admin";
import { AdminSidebar } from "./AdminSidebar";

/**
 * v145 — Admin layout.
 *
 * Sits on the same dark cosmic surface as the rest of the brand
 * (Cortex modal, OrkestriaLoader, login). Two layered radial
 * gradients give the page depth without competing with the data
 * UI on top.
 *
 * Defensive: if `requireAdminSession()` throws anything other than
 * a Next.js redirect, we log it server-side so it shows up in the
 * host logs (Vercel / VPS stdout) and let it bubble to the global
 * error boundary instead of silently 500-ing the whole admin tree.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  let session;
  try {
    session = await requireAdminSession();
  } catch (err) {
    // `redirect()` throws a tagged Next.js error — let it through.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (err as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
    ) {
      throw err;
    }
    console.error("[admin/layout] requireAdminSession failed:", err);
    throw err;
  }

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
