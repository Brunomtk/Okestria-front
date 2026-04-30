/**
 * v145.2 — Cosmic admin table primitive.
 *
 * Server component (no "use client"): pure JSX, no hooks, no
 * handlers. Server-rendered so callers can safely pass through
 * server-only props (lucide icons, server-resolved data, etc.)
 * without hitting RSC serialization.
 *
 * Replaces the shadcn `<Table>` family in admin lists so the
 * surfaces match the rest of the brand (dark glass, gradient
 * hairlines, soft hover lift). Generic over the row shape — pass
 * a `columns` array and a `rows` array.
 *
 * Usage:
 *   <AdminTable
 *     columns={[
 *       { key: "name",   header: "Name" },
 *       { key: "email",  header: "Email" },
 *       { key: "actions", header: "", className: "text-right" },
 *     ]}
 *     rows={items.map((it) => ({ id: it.id, cells: { name, email, actions } }))}
 *     emptyHint="No companies yet"
 *   />
 */

import type { ReactNode } from "react";

export type AdminColumn = {
  key: string;
  header: ReactNode;
  /** Tailwind classes appended to the th + td. */
  className?: string;
  /** Tailwind classes appended ONLY to the th. */
  headerClassName?: string;
};

export type AdminRow = {
  id: string | number;
  cells: Record<string, ReactNode>;
  /** When set, the entire row becomes a link (handled at the row level). */
  href?: string;
};

export function AdminTable({
  columns,
  rows,
  emptyHint = "No records",
}: {
  columns: AdminColumn[];
  rows: AdminRow[];
  emptyHint?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-white/8 bg-white/[0.02]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-left font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/45 ${col.className ?? ""} ${col.headerClassName ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-[13px] text-white/40"
              >
                {emptyHint}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.025]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-[13px] text-white/80 ${col.className ?? ""}`}
                  >
                    {row.cells[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helper atoms used across admin tables
// ─────────────────────────────────────────────────────────────────────

export function AdminCellTitle({
  primary,
  secondary,
  href,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <div className="truncate text-[13.5px] font-medium text-white/90">
        {primary}
      </div>
      {secondary ? (
        <div className="mt-0.5 truncate font-mono text-[10.5px] text-white/40">
          {secondary}
        </div>
      ) : null}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className="block min-w-0 transition-colors hover:text-white"
      >
        {inner}
      </a>
    );
  }
  return <div className="min-w-0">{inner}</div>;
}

export function AdminCellAvatar({
  emoji,
  accent = "#a78bfa",
}: {
  emoji: string;
  accent?: string;
}) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px]"
      style={{
        background: `${accent}1f`,
        border: `1px solid ${accent}55`,
      }}
    >
      {emoji}
    </span>
  );
}

export function AdminMonoText({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11.5px] text-white/55">{children}</span>;
}
