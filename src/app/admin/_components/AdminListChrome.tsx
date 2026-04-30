/**
 * v145.2 — Reusable list-page chrome (search bar + pagination
 * footer) shared by all admin list views.
 *
 * Server component (no "use client"): the search form uses native
 * browser submission (no JS), and pagination is just <Link>s.
 * Keeping this as a server component avoids RSC boundary
 * serialization for any data the consumer passes in.
 */

import Link from "next/link";
import { Search } from "lucide-react";
import { buildPageHref, type AdminSearchParams } from "../_lib/list-utils";

export function SearchBar({
  query,
  basePath,
  placeholder,
}: {
  query: string;
  basePath: string;
  placeholder: string;
}) {
  return (
    <form className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3 backdrop-blur sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-violet-400/55"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-[12px] font-semibold text-violet-100 transition hover:bg-violet-500/25"
        >
          Apply filter
        </button>
        <Link
          href={basePath}
          className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-[12px] font-medium text-white/65 transition hover:bg-white/[0.05] hover:text-white"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}

export function Pagination({
  basePath,
  currentPage,
  pageCount,
  params,
  totalLabel,
}: {
  basePath: string;
  currentPage: number;
  pageCount: number;
  params: AdminSearchParams;
  totalLabel: string;
}) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
      <span>
        page {currentPage} of {pageCount} · {totalLabel}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={buildPageHref(basePath, params, Math.max(1, currentPage - 1))}
          className={`rounded-lg border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[11px] font-medium transition ${
            currentPage <= 1
              ? "pointer-events-none opacity-40"
              : "text-white/70 hover:bg-white/[0.05] hover:text-white"
          }`}
        >
          ← Prev
        </Link>
        <Link
          href={buildPageHref(basePath, params, Math.min(pageCount, currentPage + 1))}
          className={`rounded-lg border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[11px] font-medium transition ${
            currentPage >= pageCount
              ? "pointer-events-none opacity-40"
              : "text-white/70 hover:bg-white/[0.05] hover:text-white"
          }`}
        >
          Next →
        </Link>
      </div>
    </div>
  );
}
