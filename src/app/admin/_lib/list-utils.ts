/**
 * v145 — Client-safe helpers for admin list views.
 *
 * Lives outside `_lib/admin.ts` because that file imports
 * `next/headers` via the auth session module, which makes it
 * server-only. `AdminListChrome.tsx` carries "use client", so it
 * needs a pure utility module it can import without dragging in
 * server runtime.
 */

export type AdminSearchParams = Record<string, string | string[] | undefined>;

export function getSingleParam(params: AdminSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getPageNumber(params: AdminSearchParams) {
  const raw = getSingleParam(params, "page");
  const parsed = Number(raw ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getSearchTerm(params: AdminSearchParams) {
  return (getSingleParam(params, "q") ?? "").trim().toLowerCase();
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const safePageSize = Math.max(pageSize, 1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * safePageSize;
  return {
    total,
    pageCount,
    currentPage,
    items: items.slice(start, start + safePageSize),
  };
}

export function buildPageHref(
  basePath: string,
  params: AdminSearchParams,
  page: number,
) {
  const search = new URLSearchParams();
  const q = getSingleParam(params, "q");
  if (q) search.set("q", q);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
