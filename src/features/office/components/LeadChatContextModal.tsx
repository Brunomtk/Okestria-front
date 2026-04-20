"use client";

import {
  Briefcase,
  Building2,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LeadGenerationJob, LeadSummary } from "@/lib/leads/lead-generation-api";

type LeadChatContextModalProps = {
  open: boolean;
  initialTab?: "jobs" | "leads";
  loading: boolean;
  error?: string | null;
  jobs: LeadGenerationJob[];
  leads: LeadSummary[];
  busyKey?: string | null;
  agentName?: string | null;
  onClose: () => void;
  onUseJob: (jobId: number) => void;
  onUseLead: (leadId: number) => void;
  onRefresh?: () => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const CYAN = "#22d3ee";
const VIOLET = "#a78bfa";

export function LeadChatContextModal({
  open,
  initialTab = "jobs",
  loading,
  error,
  jobs,
  leads,
  busyKey,
  agentName,
  onClose,
  onUseJob,
  onUseLead,
  onRefresh,
}: LeadChatContextModalProps) {
  const [activeTab, setActiveTab] = useState<"jobs" | "leads">(initialTab);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setQuery("");
    }
  }, [initialTab, open]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => {
      const bag = `${job.title ?? ""} ${job.query ?? ""} ${job.region ?? ""} ${job.status ?? ""}`.toLowerCase();
      return bag.includes(q);
    });
  }, [jobs, query]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) => {
      const bag = `${lead.businessName ?? ""} ${lead.city ?? ""} ${lead.state ?? ""} ${lead.category ?? ""} ${lead.email ?? ""} ${lead.status ?? ""}`.toLowerCase();
      return bag.includes(q);
    });
  }, [leads, query]);

  if (!open) return null;

  const accent = activeTab === "jobs" ? CYAN : VIOLET;
  const activeCount = activeTab === "jobs" ? filteredJobs.length : filteredLeads.length;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-[#0b0e14] shadow-[0_32px_120px_rgba(0,0,0,.72)]"
        style={{ borderColor: `${accent}30` }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}20`, border: `1.5px solid ${accent}50` }}
          >
            <Target className="h-5 w-5" style={{ color: accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">Pull leads into chat</h2>
            <p className="text-xs text-white/40">
              Send a mission or single lead to{" "}
              <span className="text-white/70">{agentName?.trim() || "the selected agent"}</span>
            </p>
          </div>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh"
              className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lead context modal"
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
              activeTab === "jobs" ? "border-b-2 text-white" : "text-white/40 hover:text-white/60"
            }`}
            style={activeTab === "jobs" ? { borderColor: CYAN } : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              Full mission
              <span
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: `${CYAN}25`, color: CYAN }}
              >
                {jobs.length}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`flex-1 py-3 text-center text-xs font-medium tracking-wide transition ${
              activeTab === "leads" ? "border-b-2 text-white" : "text-white/40 hover:text-white/60"
            }`}
            style={activeTab === "leads" ? { borderColor: VIOLET } : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              Single lead
              <span
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: `${VIOLET}25`, color: VIOLET }}
              >
                {leads.length}
              </span>
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-white/10 px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                activeTab === "jobs"
                  ? "Search missions by name, query or region"
                  : "Search leads by business, city or status"
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/25"
            />
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/65">
              <Loader2 className="h-4 w-4 animate-spin" />
              {activeTab === "jobs" ? "Loading lead missions..." : "Loading leads..."}
            </div>
          ) : activeCount === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/45">
              {activeTab === "jobs"
                ? jobs.length === 0
                  ? "No lead missions found for this company yet."
                  : "No missions match that search."
                : leads.length === 0
                  ? "No leads in the vault yet."
                  : "No leads match that search."}
            </div>
          ) : activeTab === "jobs" ? (
            <ul className="space-y-3">
              {filteredJobs.map((job) => {
                const busy = busyKey === `job:${job.id}`;
                const title =
                  job.title || `${job.query || "Lead mission"} · ${job.region || "Unknown region"}`;
                return (
                  <li
                    key={job.id}
                    className="group rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 shrink-0 text-cyan-300/80" />
                          <span className="truncate text-sm font-semibold text-white">{title}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/55">
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-medium uppercase tracking-wide text-white/60">
                            {job.status || "unknown"}
                          </span>
                          {job.query ? (
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                              {job.query}
                            </span>
                          ) : null}
                          {job.region ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                              <MapPin className="h-3 w-3" /> {job.region}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-white/45">
                            {formatDate(job.updatedDate || job.createdDate)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUseJob(job.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        Use mission
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-3">
              {filteredLeads.map((lead) => {
                const busy = busyKey === `lead:${lead.id}`;
                return (
                  <li
                    key={lead.id}
                    className="group rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-violet-400/30 hover:bg-violet-400/[0.04]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-violet-300/80" />
                          <span className="truncate text-sm font-semibold text-white">
                            {lead.businessName || `Lead #${lead.id}`}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/55">
                          {lead.category ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                              <Sparkles className="h-3 w-3 text-violet-300/70" /> {lead.category}
                            </span>
                          ) : null}
                          {(lead.city || lead.state) ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                              <MapPin className="h-3 w-3" />
                              {[lead.city, lead.state].filter(Boolean).join(", ")}
                            </span>
                          ) : null}
                          {lead.email ? (
                            <span className="truncate rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-white/65">
                              {lead.email}
                            </span>
                          ) : null}
                          {lead.status ? (
                            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-medium uppercase tracking-wide text-white/55">
                              {lead.status}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUseLead(lead.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        Use lead
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error ? (
          <div className="border-t border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>
    </div>
  );
}
