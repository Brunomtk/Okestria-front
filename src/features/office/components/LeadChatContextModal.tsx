"use client";

import { Building2, Loader2, MessageSquare, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
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
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

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
}: LeadChatContextModalProps) {
  const [activeTab, setActiveTab] = useState<"jobs" | "leads">(initialTab);

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [initialTab, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#050816] shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">Lead context</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Pull leads into chat</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Send a full lead mission or one specific lead to {agentName?.trim() || "the selected agent"} without leaving the chat.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close lead context modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("jobs")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${activeTab === "jobs" ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30" : "text-white/55 hover:text-white"}`}
            >
              Full generation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("leads")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${activeTab === "leads" ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30" : "text-white/55 hover:text-white"}`}
            >
              Specific lead
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          {activeTab === "jobs" ? (
            <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.05] p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <Search className="h-4 w-4 text-cyan-300" />
                Recent lead missions
              </div>
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/65">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading lead missions...
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                    No lead missions found for this company.
                  </div>
                ) : (
                  jobs.map((job) => {
                    const busy = busyKey === `job:${job.id}`;
                    return (
                      <div key={job.id} className="rounded-2xl border border-white/10 bg-[#0a1024] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{job.title || `${job.query || "Lead mission"} · ${job.region || "Unknown region"}`}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/45">
                              <span className="rounded-full border border-white/10 px-2 py-1">{job.status || "unknown"}</span>
                              {job.query ? <span className="rounded-full border border-white/10 px-2 py-1">{job.query}</span> : null}
                              {job.region ? <span className="rounded-full border border-white/10 px-2 py-1">{job.region}</span> : null}
                              <span className="rounded-full border border-white/10 px-2 py-1">Updated {formatDate(job.updatedDate || job.createdDate)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onUseJob(job.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-200 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/25 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                            Use mission in chat
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <Building2 className="h-4 w-4 text-violet-300" />
                Recent leads
              </div>
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/65">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading leads...
                  </div>
                ) : leads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                    No leads found for this company.
                  </div>
                ) : (
                  leads.map((lead) => {
                    const busy = busyKey === `lead:${lead.id}`;
                    return (
                      <div key={lead.id} className="rounded-2xl border border-white/10 bg-[#0a1024] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{lead.businessName || `Lead #${lead.id}`}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/45">
                              {lead.city ? <span className="rounded-full border border-white/10 px-2 py-1">{lead.city}</span> : null}
                              {lead.category ? <span className="rounded-full border border-white/10 px-2 py-1">{lead.category}</span> : null}
                              {lead.email ? <span className="rounded-full border border-white/10 px-2 py-1">{lead.email}</span> : null}
                              {lead.status ? <span className="rounded-full border border-white/10 px-2 py-1">{lead.status}</span> : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onUseLead(lead.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-200 ring-1 ring-violet-500/30 transition hover:bg-violet-500/25 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                            Use lead in chat
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>

        {error ? (
          <div className="border-t border-rose-500/20 bg-rose-500/10 px-6 py-4 text-sm text-rose-100">{error}</div>
        ) : null}
      </div>
    </div>
  );
}
