"use client";

import { Trash2 } from "lucide-react";

/**
 * v145 — Admin · client-only delete button.
 *
 * Lives in its own file so it can carry the "use client" directive
 * without forcing every consumer of <AdminDetail> primitives to be
 * a client component.
 */

export function AdminDeleteButton({
  label = "Delete",
  confirmText = "Delete this record? This cannot be undone.",
}: {
  label?: string;
  confirmText?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (typeof window === "undefined") return;
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3.5 py-2 text-[12.5px] font-medium text-rose-200 transition hover:bg-rose-500/20"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
