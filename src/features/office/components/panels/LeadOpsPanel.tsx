"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bot, BrainCircuit, ChevronRight, Copy, ExternalLink, Eye, Globe, LayoutGrid, List, Loader2, Mail, MapPin, Phone, Plus, Radar, RefreshCw, Search, Sparkles, Star, UserRound, X } from "lucide-react";

import type { AgentState } from "@/features/agents/state/store";
import {
  cancelLeadGenerationJob,
  cancelLeadEmailBatchJob,
  createLeadEmailBatchJob,
  createLeadGenerationJob,
  getLeadGenerationJob,
  listLeadEmailBatchJobs,
  listLeadGenerationJobs,
  listLeadsByJob,
  getLeadById,
  generateLeadInsights,
  type LeadEmailBatchJob,
  type LeadGenerationJob,
  type LeadSummary,
} from "@/lib/leads/lead-generation-api";
import {
  extractGatewayAgentId,
  fetchCompanyAgentDetails,
  fetchCompanyAgents,
  getBrowserCompanyId,
} from "@/lib/agents/backend-api";

const DEFAULT_PROMPT =
  "Find high-intent businesses, enrich contact data, deduplicate results, generate PTX fit, and prepare outreach-ready leads.";

const LEAD_NICHE_EXAMPLES = [
  "Dental clinics",
  "Law firms",
  "Luxury gyms",
  "Med spas",
  "Roofing companies",
  "Accounting firms",
  "Real estate agencies",
  "Beauty salons",
];

const STATUS_STYLES: Record<string, string> = {
  queued: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  running: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  completed: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  cancelled: "border-white/15 bg-white/5 text-white/60",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};


type LeadAgentOption = {
  backendAgentId: number;
  gatewayAgentId?: string | null;
  name: string;
};

const getProgressLabel = (job: LeadGenerationJob) => {
  if (job.status === "completed") return "Completed";
  if (job.status === "failed") return "Failed";
  if (job.status === "cancelled") return "Cancelled";
  if (job.progressPercent > 0) return `${job.progressPercent}%`;
  return job.status === "running" ? "Starting" : "Queued";
};

export function LeadOpsPanel({
  agents,
  companyName,
  onSelectAgent,
}: {
  agents: AgentState[];
  companyName?: string | null;
  onSelectAgent: (agentId: string) => void;
}) {
  const companyId = getBrowserCompanyId();

  const [leadAgentOptions, setLeadAgentOptions] = useState<LeadAgentOption[]>([]);
  const [selectedBackendAgentId, setSelectedBackendAgentId] = useState<number>(0);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [maxResults, setMaxResults] = useState(120);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [jobs, setJobs] = useState<LeadGenerationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobLeads, setJobLeads] = useState<LeadSummary[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [leadBrowserJobId, setLeadBrowserJobId] = useState<number | null>(null);
  const [leadBrowserSearch, setLeadBrowserSearch] = useState("");
  const [leadBrowserView, setLeadBrowserView] = useState<"index" | "cards">("index");
  const [selectedBrowserLeadId, setSelectedBrowserLeadId] = useState<number | null>(null);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<LeadSummary | null>(null);
  const [loadingLeadDetail, setLoadingLeadDetail] = useState(false);
  const [generatingLeadInsights, setGeneratingLeadInsights] = useState(false);
  const [autoGeneratingLeadInsights, setAutoGeneratingLeadInsights] = useState(false);
  const [leadDetailTab, setLeadDetailTab] = useState<"overview" | "outreach">("overview");
  const [emailPreviewMode, setEmailPreviewMode] = useState<"preview" | "html">("preview");

  const [emailBatchModalOpen, setEmailBatchModalOpen] = useState(false);
  const [emailBatchJobs, setEmailBatchJobs] = useState<LeadEmailBatchJob[]>([]);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [emailSenderName, setEmailSenderName] = useState(companyName?.trim() || "Growth Team");
  const [emailSenderAddress, setEmailSenderAddress] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState("{{businessName}} · quick idea to win more qualified demand");
  const [emailIntroText, setEmailIntroText] = useState("I asked our team to prepare a tailored idea based on your business profile.");

  useEffect(() => {
    let cancelled = false;

    const loadLeadAgents = async () => {
      if (!companyId) {
        setLeadAgentOptions([]);
        setSelectedBackendAgentId(0);
        return;
      }

      try {
        const summaries = await fetchCompanyAgents(companyId);
        const details = await Promise.all(
          summaries.map(async (agent) => {
            try {
              return await fetchCompanyAgentDetails(agent.id);
            } catch {
              return null;
            }
          }),
        );

        if (cancelled) return;

        const options = summaries
          .map((summary, index) => {
            const detail = details[index];
            const gatewayAgentId = detail ? extractGatewayAgentId(detail) : null;
            return {
              backendAgentId: detail?.id ?? summary.id,
              gatewayAgentId: gatewayAgentId || null,
              name: detail?.name?.trim() || detail?.slug?.trim() || summary.name?.trim() || summary.slug?.trim() || `Agent ${summary.id}`,
            } satisfies LeadAgentOption;
          })
          .filter((entry, index, array) => array.findIndex((candidate) => candidate.backendAgentId === entry.backendAgentId) === index);

        setLeadAgentOptions(options);
        setSelectedBackendAgentId((current) =>
          current && options.some((entry) => entry.backendAgentId === current)
            ? current
            : (options[0]?.backendAgentId ?? 0),
        );
      } catch {
        if (cancelled) return;
        setLeadAgentOptions([]);
        setSelectedBackendAgentId(0);
      }
    };

    void loadLeadAgents();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const refreshJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const loaded = await listLeadGenerationJobs(companyId);
      const sorted = [...loaded].sort((left, right) => right.id - left.id);
      setJobs(sorted);
      setSelectedJobId((current) => current ?? sorted[0]?.id ?? null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load lead jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }, [companyId]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs, refreshTick]);

  useEffect(() => {
    const hasActiveJob = jobs.some((job) => job.status === "queued" || job.status === "running");
    if (!hasActiveJob) return;
    const timer = window.setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [jobs]);

  useEffect(() => {
    if (!selectedJobId) {
      setJobLeads([]);
      setEmailBatchJobs([]);
      return;
    }
    let cancelled = false;
    const loadDetails = async () => {
      try {
        const [job, leads] = await Promise.all([
          getLeadGenerationJob(selectedJobId),
          listLeadsByJob(selectedJobId),
        ]);
        if (cancelled) return;
        if (job) {
          setJobs((current) => [job, ...current.filter((entry) => entry.id !== job.id)].sort((a, b) => b.id - a.id));
        }
        setJobLeads(leads);
      } catch (detailError) {
        if (cancelled) return;
        setError(detailError instanceof Error ? detailError.message : "Failed to load lead job details.");
      }
    };
    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );


  useEffect(() => {
    if (!selectedJobId) return;
    let cancelled = false;
    const loadEmailJobs = async () => {
      try {
        const jobs = await listLeadEmailBatchJobs(companyId, selectedJobId);
        if (!cancelled) setEmailBatchJobs(jobs);
      } catch {
        if (!cancelled) setEmailBatchJobs([]);
      }
    };
    void loadEmailJobs();
    return () => {
      cancelled = true;
    };
  }, [companyId, refreshTick, selectedJobId]);

  const leadBrowserJob = useMemo(
    () => jobs.find((job) => job.id === leadBrowserJobId) ?? null,
    [jobs, leadBrowserJobId],
  );

  const selectedLeadAgent = useMemo(
    () => leadAgentOptions.find((entry) => entry.backendAgentId === selectedBackendAgentId) ?? null,
    [leadAgentOptions, selectedBackendAgentId],
  );

  const metrics = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        acc.totalRuns += 1;
        acc.totalInserted += job.totalInserted;
        acc.totalFound += job.totalFound;
        if (job.status === "running" || job.status === "queued") acc.active += 1;
        return acc;
      },
      { totalRuns: 0, totalInserted: 0, totalFound: 0, active: 0 },
    );
  }, [jobs]);



  const filteredJobLeads = useMemo(() => {
    const search = leadBrowserSearch.trim().toLowerCase();
    if (!search) return jobLeads;
    return jobLeads.filter((lead) =>
      [lead.businessName, lead.category, lead.city, lead.state, lead.email, lead.website, lead.phone, lead.ptxFit]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [jobLeads, leadBrowserSearch]);

  const groupedLeadSummary = useMemo(() => {
    const highFit = filteredJobLeads.filter((lead) => (lead.ptxFit || '').toLowerCase().includes('high'));
    const withEmail = filteredJobLeads.filter((lead) => !!lead.email);
    const withWebsite = filteredJobLeads.filter((lead) => !!lead.website);
    return { highFit: highFit.length, withEmail: withEmail.length, withWebsite: withWebsite.length };
  }, [filteredJobLeads]);

  const selectedBrowserLead = useMemo(
    () => filteredJobLeads.find((lead) => lead.id === selectedBrowserLeadId) ?? null,
    [filteredJobLeads, selectedBrowserLeadId],
  );

  const handleCreateJob = useCallback(async () => {
    if (!companyId || !selectedBackendAgentId || !query.trim()) {
      setError("Choose an agent and define the search niche before starting the run.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createLeadGenerationJob({
        companyId,
        agentId: selectedBackendAgentId,
        title: `${query.trim()}${region.trim() ? ` · ${region.trim()}` : ""}`,
        query: query.trim(),
        region: region.trim() || undefined,
        prompt: prompt.trim() || DEFAULT_PROMPT,
        maxResults,
        mode: "background",
      });
      setJobs((current) => [
        { ...created, agentName: selectedLeadAgent?.name ?? created.agentName },
        ...current.filter((entry) => entry.id !== created.id),
      ]);
      setSelectedJobId(created.id);
      setMissionModalOpen(false);
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to start lead generation job.");
    } finally {
      setSubmitting(false);
    }
  }, [companyId, maxResults, prompt, query, region, selectedBackendAgentId, selectedLeadAgent]);

  const handleOpenLeadBrowser = useCallback((jobId: number) => {
    setSelectedJobId(jobId);
    setLeadBrowserJobId(jobId);
    setLeadBrowserSearch("");
    setLeadBrowserView("index");
    setSelectedBrowserLeadId(null);
    setSelectedLeadDetail(null);
  }, []);

  const handleCloseLeadDetailModal = useCallback(() => {
    setSelectedBrowserLeadId(null);
    setSelectedLeadDetail(null);
    setLoadingLeadDetail(false);
    setLeadDetailTab("overview");
  }, []);

  useEffect(() => {
    if (!selectedBrowserLead) {
      setSelectedLeadDetail(null);
      return;
    }
    setLeadDetailTab("overview");

    let cancelled = false;
    setLoadingLeadDetail(true);
    setSelectedLeadDetail(selectedBrowserLead);

    const loadLeadDetail = async () => {
      try {
        const detail = await getLeadById(selectedBrowserLead.id);
        if (cancelled) return;
        setSelectedLeadDetail(detail ?? selectedBrowserLead);
      } catch {
        if (cancelled) return;
        setSelectedLeadDetail(selectedBrowserLead);
      } finally {
        if (!cancelled) setLoadingLeadDetail(false);
      }
    };

    void loadLeadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedBrowserLead]);

  const applyUpdatedLead = useCallback((updated: LeadSummary | null) => {
    if (!updated) return;
    setSelectedLeadDetail(updated);
    setJobLeads((current) => current.map((lead) => (lead.id === updated.id ? { ...lead, ...updated } : lead)));
  }, []);

  const handleGenerateLeadInsights = useCallback(async (options?: { silent?: boolean; forceRegenerate?: boolean }) => {
    if (!selectedBrowserLeadId) return;
    if (options?.silent) {
      setAutoGeneratingLeadInsights(true);
    } else {
      setGeneratingLeadInsights(true);
    }
    try {
      const updated = await generateLeadInsights(selectedBrowserLeadId, null, {
        forceRegenerate: options?.forceRegenerate ?? true,
        preferredModel: "gpt-4.1-mini",
      });
      applyUpdatedLead(updated);
      setError(null);
    } catch (insightError) {
      if (!options?.silent) {
        setError(insightError instanceof Error ? insightError.message : "Failed to generate insights for this lead.");
      }
    } finally {
      if (options?.silent) {
        setAutoGeneratingLeadInsights(false);
      } else {
        setGeneratingLeadInsights(false);
      }
    }
  }, [applyUpdatedLead, selectedBrowserLeadId]);

  useEffect(() => {
    if (
      leadDetailTab !== "outreach" ||
      !selectedLeadDetail ||
      !selectedBrowserLeadId ||
      loadingLeadDetail ||
      generatingLeadInsights ||
      autoGeneratingLeadInsights
    ) {
      return;
    }
    if (!leadNeedsInsights(selectedLeadDetail)) {
      return;
    }
    void handleGenerateLeadInsights({ silent: true, forceRegenerate: false });
  }, [
    autoGeneratingLeadInsights,
    generatingLeadInsights,
    handleGenerateLeadInsights,
    leadDetailTab,
    loadingLeadDetail,
    selectedBrowserLeadId,
    selectedLeadDetail,
  ]);



  const detailFitLabel = useMemo(() => formatFitLabel(selectedLeadDetail?.ptxFit), [selectedLeadDetail?.ptxFit]);
  const detailStatusLabel = useMemo(() => formatStatusLabel(selectedLeadDetail?.status), [selectedLeadDetail?.status]);
  const detailRecommendedProduct = useMemo(() => selectedLeadDetail?.suggestedProduct?.trim() || "PTX Growth", [selectedLeadDetail?.suggestedProduct]);
  const detailOwnerName = useMemo(() => [selectedLeadDetail?.ownerFirstName, selectedLeadDetail?.ownerLastName].filter(Boolean).join(" ") || deriveOwnerName(selectedLeadDetail?.businessName), [selectedLeadDetail?.ownerFirstName, selectedLeadDetail?.ownerLastName, selectedLeadDetail?.businessName]);
  const detailPrimaryCta = useMemo(() => selectedLeadDetail?.phone ? "Start a quick call" : selectedLeadDetail?.email ? "Send quick email" : "Open website", [selectedLeadDetail?.phone, selectedLeadDetail?.email]);
  const detailInsightSummary = useMemo(() => selectedLeadDetail?.outreachInsight?.trim() || selectedLeadDetail?.description?.trim() || `Strong local presence for ${selectedLeadDetail?.businessName || "this lead"}. Use a concise outreach angle tied to visible reputation, category, and location context.`, [selectedLeadDetail?.outreachInsight, selectedLeadDetail?.description, selectedLeadDetail?.businessName]);
  const detailCoreScript = useMemo(() => buildCoreScript(selectedLeadDetail), [selectedLeadDetail]);
  const detailSuggestedOpener = useMemo(() => buildSuggestedOpener(selectedLeadDetail), [selectedLeadDetail]);
  const detailNextStep = useMemo(() => buildNextStep(selectedLeadDetail), [selectedLeadDetail]);
  const detailTalkTrack = useMemo(() => buildTalkTrack(selectedLeadDetail), [selectedLeadDetail]);
  const detailPersonalizationCues = useMemo(() => buildPersonalizationCues(selectedLeadDetail), [selectedLeadDetail]);
  const detailRecommendedSequence = useMemo(() => buildSequence(selectedLeadDetail), [selectedLeadDetail]);
  const outreachEmailSubject = useMemo(() => buildEmailSubject(selectedLeadDetail), [selectedLeadDetail]);
  const outreachEmailBody = useMemo(() => buildEmailBody(selectedLeadDetail), [selectedLeadDetail]);
  const outreachEmailHtml = useMemo(() => buildEmailHtml(selectedLeadDetail), [selectedLeadDetail]);

  const handleCopyText = useCallback(async (value: string | null | undefined, successMessage: string) => {
    if (!value || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setError(successMessage);
      window.setTimeout(() => setError((current) => (current === successMessage ? null : current)), 1800);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, []);

  const handleCancelSelectedJob = useCallback(async () => {
    if (!selectedJob) return;
    await cancelLeadGenerationJob(selectedJob.id);
    setJobs((current) =>
      current.map((entry) =>
        entry.id === selectedJob.id
          ? { ...entry, status: "cancelled", currentStage: "Cancelled" }
          : entry,
      ),
    );
  }, [selectedJob]);

  const handleCreateEmailBatch = useCallback(async () => {
    if (!companyId || !selectedJob) return;
    setSendingBatch(true);
    try {
      const created = await createLeadEmailBatchJob({
        companyId,
        sourceLeadJobId: selectedJob.id,
        title: `Outreach batch · ${selectedJob.title}`,
        senderName: emailSenderName.trim(),
        senderEmail: emailSenderAddress.trim(),
        replyTo: emailReplyTo.trim() || undefined,
        subjectTemplate: emailSubjectTemplate.trim(),
        introText: emailIntroText.trim() || undefined,
      });
      setEmailBatchJobs((current) => [created, ...current.filter((entry) => entry.id !== created.id)]);
      setEmailBatchModalOpen(false);
      setError(null);
      setRefreshTick((value) => value + 1);
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "Failed to queue lead email batch.");
    } finally {
      setSendingBatch(false);
    }
  }, [companyId, emailIntroText, emailReplyTo, emailSenderAddress, emailSenderName, emailSubjectTemplate, selectedJob]);

  const handleCancelEmailBatch = useCallback(async (jobId: number) => {
    try {
      await cancelLeadEmailBatchJob(jobId);
      setEmailBatchJobs((current) => current.map((entry) => entry.id === jobId ? { ...entry, status: "cancelled", currentStage: "Cancelled" } : entry));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Failed to cancel email batch.");
    }
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_45%)]">
      <div className="border-b border-cyan-500/10 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200">Lead Ops</div>
            <div className="mt-2 font-mono text-[11px] leading-5 text-white/48">
              Single-screen workspace for prospecting missions. Create a new mission from the modal, track one selected run here, and open the full lead vault only when needed.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMissionModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-300/45 hover:bg-cyan-500/15"
            >
              <Plus className="h-4 w-4" />
              Add new
            </button>
            <button
              type="button"
              onClick={() => void refreshJobs()}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-cyan-400/25 hover:text-white"
            >
              Refresh
            </button>
            {selectedLeadAgent?.gatewayAgentId ? (
              <button
                type="button"
                onClick={() => onSelectAgent(selectedLeadAgent.gatewayAgentId!)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-cyan-400/25 hover:text-white"
              >
                <Bot className="h-4 w-4" />
                Open agent
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active jobs" value={String(metrics.active)} />
            <StatCard label="Runs" value={String(metrics.totalRuns)} />
            <StatCard label="Leads found" value={String(metrics.totalFound)} />
            <StatCard label="Saved leads" value={String(metrics.totalInserted)} />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 font-mono text-[11px] text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(3,12,18,0.98),rgba(2,8,12,0.96))] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/75">Selected mission</div>
                <div className="mt-1 font-mono text-[11px] text-white/40">Run status, execution stage, and quick actions for the current mission.</div>
              </div>
              {selectedJob ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${STATUS_STYLES[selectedJob.status] ?? STATUS_STYLES.queued}`}>
                    {selectedJob.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenLeadBrowser(selectedJob.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:border-cyan-300/45 hover:bg-cyan-500/15"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View all leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailBatchModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100 transition-colors hover:border-emerald-300/45 hover:bg-emerald-500/15"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Send batch email
                  </button>
                  {(selectedJob.status === "queued" || selectedJob.status === "running") ? (
                    <button
                      type="button"
                      onClick={() => void handleCancelSelectedJob()}
                      className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-rose-100 transition-colors hover:border-rose-300/45"
                    >
                      Cancel job
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedJob ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                  <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-cyan-100">{selectedJob.title}</div>
                  <div className="mt-2 font-mono text-[11px] leading-5 text-white/48">{selectedJob.prompt || DEFAULT_PROMPT}</div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Found" value={String(selectedJob.totalFound)} />
                    <StatCard label="Saved" value={String(selectedJob.totalInserted)} />
                    <StatCard label="Enriched" value={String(selectedJob.totalEnriched)} />
                    <StatCard label="Duplicates" value={String(selectedJob.totalDuplicates)} />
                  </div>

                  <div className="mt-4 rounded-xl border border-white/8 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                      <span>Current stage</span>
                      <span>{getProgressLabel(selectedJob)}</span>
                    </div>
                    <div className="mt-2 text-sm text-white/85">{selectedJob.currentStage || "Queued"}</div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400/80 transition-all" style={{ width: `${Math.min(100, Math.max(0, selectedJob.progressPercent))}%` }} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MiniMetaCard label="Started" value={formatDateTime(selectedJob.startedAtUtc || selectedJob.createdDate)} />
                      <MiniMetaCard label="Finished" value={formatDateTime(selectedJob.finishedAtUtc)} />
                      <MiniMetaCard label="Agent" value={selectedJob.agentName || String(selectedJob.agentId)} />
                    </div>
                    {emailBatchJobs.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100">Email batches</div>
                            <div className="mt-1 font-mono text-[11px] text-white/45">Background delivery queue for the leads generated by this mission.</div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {emailBatchJobs.slice(0, 3).map((batch) => (
                            <div key={batch.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">{batch.title}</div>
                                  <div className="mt-1 text-sm text-white/82">{batch.currentStage}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${STATUS_STYLES[batch.status] ?? STATUS_STYLES.queued}`}>{batch.status}</span>
                                  {(batch.status === "queued" || batch.status === "running") ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleCancelEmailBatch(batch.id)}
                                      className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-rose-100"
                                    >
                                      Cancel
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                                <MiniMetaCard label="Selected" value={String(batch.totalSelected)} />
                                <MiniMetaCard label="Eligible" value={String(batch.totalEligible)} />
                                <MiniMetaCard label="Sent" value={String(batch.totalSent)} />
                                <MiniMetaCard label="Failed" value={String(batch.totalFailed)} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedJob.errorMessage ? (
                      <div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 font-mono text-[11px] text-rose-100">
                        {selectedJob.errorMessage}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.05] px-3 py-3 font-mono text-[11px] leading-5 text-white/55">
                        Open <span className="text-cyan-100">View all leads</span> to inspect the full list, switch visualization mode, and generate insights per lead with the selected agent.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 font-mono text-[11px] text-white/35">
                No mission selected yet. Create a new run or choose one from the recent missions list below.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-cyan-500/15 bg-[linear-gradient(180deg,rgba(3,12,18,0.98),rgba(2,8,12,0.96))] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/75">Recent missions</div>
                <div className="mt-1 font-mono text-[11px] text-white/40">Select a run to inspect it above or open the full lead vault.</div>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                {jobs.length} total run{jobs.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {loadingJobs ? (
                <div className="flex items-center gap-2 px-2 py-5 font-mono text-[11px] text-white/45">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading lead operations...
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 font-mono text-[11px] text-white/35">
                  No lead missions yet. Click <span className="text-cyan-200">Add new</span> to create the first background run.
                </div>
              ) : (
                jobs.map((job) => {
                  const active = selectedJobId === job.id;
                  return (
                    <div
                      key={job.id}
                      className={`rounded-xl border px-4 py-4 transition-colors ${
                        active
                          ? "border-cyan-400/40 bg-cyan-500/[0.08]"
                          : "border-white/8 bg-white/[0.03] hover:border-cyan-400/25 hover:bg-cyan-500/[0.04]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-white/90">{job.title}</div>
                            <div className="mt-1 font-mono text-[11px] text-white/45">{job.query}</div>
                          </div>
                          <span className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${STATUS_STYLES[job.status] ?? STATUS_STYLES.queued}`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/38">
                          <div>
                            <div className="text-white/30">Agent</div>
                            <div className="mt-1 truncate text-[11px] normal-case tracking-normal text-white/78">{job.agentName || job.agentId || "Agent"}</div>
                          </div>
                          <div>
                            <div className="text-white/30">Saved</div>
                            <div className="mt-1 text-[11px] normal-case tracking-normal text-white/78">{job.totalInserted}</div>
                          </div>
                          <div>
                            <div className="text-white/30">Progress</div>
                            <div className="mt-1 text-[11px] normal-case tracking-normal text-white/78">{getProgressLabel(job)}</div>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-cyan-400/80 transition-all" style={{ width: `${Math.min(100, Math.max(0, job.progressPercent))}%` }} />
                        </div>
                      </button>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">
                          {job.totalInserted || job.totalFound} lead{(job.totalInserted || job.totalFound) === 1 ? '' : 's'} available
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenLeadBrowser(job.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:border-cyan-300/45 hover:bg-cyan-500/15"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View all leads
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>



      {emailBatchModalOpen && selectedJob ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-emerald-400/20 bg-[#02070b] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-100">Send batch email</div>
                <div className="mt-2 text-sm text-white/70">Queue a background outreach batch for the leads from <span className="text-white">{selectedJob.title}</span>. Tokens supported in the subject and intro: <code className="rounded bg-white/5 px-1 py-0.5 text-[12px] text-emerald-100">{"{{businessName}}"}</code>, <code className="rounded bg-white/5 px-1 py-0.5 text-[12px] text-emerald-100">{"{{city}}"}</code>, <code className="rounded bg-white/5 px-1 py-0.5 text-[12px] text-emerald-100">{"{{state}}"}</code>, <code className="rounded bg-white/5 px-1 py-0.5 text-[12px] text-emerald-100">{"{{category}}"}</code>, <code className="rounded bg-white/5 px-1 py-0.5 text-[12px] text-emerald-100">{"{{ownerName}}"}</code>.</div>
              </div>
              <button type="button" onClick={() => setEmailBatchModalOpen(false)} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Sender name</span>
                <input value={emailSenderName} onChange={(event) => setEmailSenderName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" placeholder="Growth Team" />
              </label>
              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Sender email</span>
                <input value={emailSenderAddress} onChange={(event) => setEmailSenderAddress(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" placeholder="sales@yourdomain.com" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Reply-to</span>
                <input value={emailReplyTo} onChange={(event) => setEmailReplyTo(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" placeholder="optional@yourdomain.com" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Subject template</span>
                <input value={emailSubjectTemplate} onChange={(event) => setEmailSubjectTemplate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Intro text</span>
                <textarea value={emailIntroText} onChange={(event) => setEmailIntroText(event.target.value)} className="min-h-[96px] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setEmailBatchModalOpen(false)} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">Cancel</button>
              <button type="button" disabled={sendingBatch} onClick={() => void handleCreateEmailBatch()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60">
                {sendingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Queue background send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {missionModalOpen ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-cyan-400/20 bg-[#041018] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_120px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-cyan-500/10 px-5 py-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200">New lead mission</div>
                <div className="mt-2 font-mono text-[14px] uppercase tracking-[0.16em] text-white/90">Mission control</div>
                <div className="mt-1 font-mono text-[11px] text-white/45">Focused setup for a new background lead generation run.</div>
              </div>
              <button
                type="button"
                onClick={() => setMissionModalOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/70 transition-colors hover:border-cyan-400/25 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto px-5 py-5">
              <div className="mb-4 rounded-2xl border border-cyan-500/15 bg-black/30 p-4">
                <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                  <Radar className="h-4 w-4" />
                  Mission control
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Executor agent</span>
                      <select
                        value={selectedBackendAgentId ? String(selectedBackendAgentId) : ""}
                        onChange={(event) => setSelectedBackendAgentId(Number(event.target.value) || 0)}
                        className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors focus:border-cyan-400/35"
                      >
                        {leadAgentOptions.length === 0 ? <option value="">No agents available</option> : null}
                        {leadAgentOptions.map((agent) => (
                          <option key={agent.backendAgentId} value={agent.backendAgentId}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Region</span>
                      <input
                        value={region}
                        onChange={(event) => setRegion(event.target.value)}
                        placeholder="City / state / country"
                        className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-cyan-400/35"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Lead niche / query</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="e.g. Dental clinics, luxury gyms, law firms"
                      className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[12px] text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-cyan-400/35"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {LEAD_NICHE_EXAMPLES.map((example) => {
                      const active = query.trim().toLowerCase() === example.toLowerCase();
                      return (
                        <button
                          key={example}
                          type="button"
                          onClick={() => setQuery(example)}
                          className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                            active
                              ? "border-cyan-300/40 bg-cyan-500/12 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-white/60 hover:border-cyan-400/25 hover:text-white"
                          }`}
                        >
                          {example}
                        </button>
                      );
                    })}
                  </div>

                  <label className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Max leads to fetch</span>
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-100">
                        {maxResults} leads
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={500}
                      step={10}
                      value={maxResults}
                      onChange={(event) => setMaxResults(Number(event.target.value) || 10)}
                      className="accent-cyan-400"
                    />
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                      <span>10</span>
                      <span>250</span>
                      <span>500</span>
                    </div>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Agent mission</span>
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      rows={5}
                      className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[12px] leading-5 text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-cyan-400/35"
                    />
                  </label>

                  {error ? <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 font-mono text-[11px] text-rose-100">{error}</div> : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
                    <div className="font-mono text-[11px] text-white/40">
                      The selected agent will run this mission in background and save qualified leads to the backend.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMissionModalOpen(false)}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-cyan-400/25 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateJob}
                        disabled={submitting || leadAgentOptions.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-300/45 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Run in background
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {leadBrowserJob ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative flex h-[min(90vh,980px)] w-full max-w-[1520px] flex-col overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#041018] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_120px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-cyan-500/10 px-5 py-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-200">Lead vault</div>
                <div className="mt-2 font-mono text-[14px] uppercase tracking-[0.16em] text-white/90">{leadBrowserJob.title}</div>
                <div className="mt-1 font-mono text-[11px] text-white/45">All persisted leads for this mission, with a detail view shaped for AI-generated outreach.</div>
              </div>
              <button
                type="button"
                onClick={() => setLeadBrowserJobId(null)}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/70 transition-colors hover:border-cyan-400/25 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 border-b border-cyan-500/10 px-5 py-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-2xl border border-cyan-500/15 bg-black/30 p-4">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                  <Search className="h-4 w-4 text-white/35" />
                  <input
                    value={leadBrowserSearch}
                    onChange={(event) => setLeadBrowserSearch(event.target.value)}
                    placeholder="Search by business, owner, city, email, website..."
                    className="w-full bg-transparent font-mono text-[12px] text-white/85 outline-none placeholder:text-white/25"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Visible leads" value={String(filteredJobLeads.length)} />
                <StatCard label="High fit" value={String(groupedLeadSummary.highFit)} />
                <StatCard label="With email" value={String(groupedLeadSummary.withEmail)} />
              </div>
            </div>

            <div className="min-h-0 flex-1 px-5 py-4">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-cyan-500/15 bg-black/25">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/10 px-4 py-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Lead browser</div>
                    <div className="mt-1 font-mono text-[11px] text-white/45">Use View to open the AI detail and outreach plan.</div>
                  </div>
                  <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/40 p-1">
                    <button
                      type="button"
                      onClick={() => setLeadBrowserView("index")}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                        leadBrowserView === "index" ? "bg-cyan-500/12 text-cyan-100" : "text-white/50 hover:text-white"
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeadBrowserView("cards")}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                        leadBrowserView === "cards" ? "bg-cyan-500/12 text-cyan-100" : "text-white/50 hover:text-white"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Cards
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {filteredJobLeads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 font-mono text-[11px] text-white/35">
                      No leads match this search yet.
                    </div>
                  ) : leadBrowserView === "index" ? (
                    <div className="space-y-3">
                      {filteredJobLeads.map((lead) => {
                        const active = lead.id === selectedBrowserLeadId;
                        return (
                          <div
                            key={lead.id}
                            className={`rounded-2xl border px-4 py-4 transition-colors ${
                              active
                                ? "border-cyan-400/35 bg-cyan-500/[0.08] shadow-[0_0_0_1px_rgba(34,211,238,0.06)]"
                                : "border-white/8 bg-white/[0.03] hover:border-cyan-400/25 hover:bg-cyan-500/[0.04]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-sans text-base font-semibold text-white">{lead.businessName}</div>
                                <div className="mt-1 text-sm text-white/45">{lead.category || "Business lead"}</div>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/62">
                                  <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-cyan-200" />{[lead.ownerFirstName, lead.ownerLastName].filter(Boolean).join(" ") || deriveOwnerName(lead.businessName)}</span>
                                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-cyan-200" />{lead.phone || "No phone"}</span>
                                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-cyan-200" />{[lead.city, lead.state].filter(Boolean).join(", ") || "No location"}</span>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {lead.rating ? <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/80"><Star className="h-3.5 w-3.5 fill-current text-amber-300" />{lead.rating}{lead.reviewCount ? ` (${lead.reviewCount})` : ""}</span> : null}
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${fitBadgeClass(lead.ptxFit)}`}>{formatFitLabel(lead.ptxFit)}</span>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusBadgeClass(lead.status)}`}>{formatStatusLabel(lead.status)}</span>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
                              <div className="min-w-0 text-sm text-cyan-300/90">{lead.website || lead.email || "No website or email"}</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setError("Task action can be wired next.")}
                                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75 transition-colors hover:border-cyan-400/25 hover:text-white"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Task
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedBrowserLeadId(lead.id)}
                                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:border-cyan-300/45 hover:bg-cyan-500/15"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredJobLeads.map((lead) => {
                        const active = lead.id === selectedBrowserLeadId;
                        return (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => setSelectedBrowserLeadId(lead.id)}
                            className={`rounded-2xl border bg-[linear-gradient(180deg,rgba(20,184,166,0.08),rgba(255,255,255,0.02))] p-4 text-left transition-colors ${
                              active ? "border-cyan-400/35 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]" : "border-cyan-500/15 hover:border-cyan-400/25"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-sans text-base font-semibold text-white">{lead.businessName}</div>
                                <div className="mt-1 text-sm text-white/50">{[lead.category, lead.city, lead.state].filter(Boolean).join(" · ") || "Business lead"}</div>
                              </div>
                              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${fitBadgeClass(lead.ptxFit)}`}>{formatFitLabel(lead.ptxFit)}</span>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-white/72">
                              <LeadInfoRow label="Email" value={lead.email} />
                              <LeadInfoRow label="Phone" value={lead.phone} />
                              <LeadInfoRow label="Website" value={lead.website} clamp />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>


            </div>

            {selectedLeadDetail ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
                <div className="relative flex h-[min(88vh,920px)] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#041018] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_120px_rgba(0,0,0,0.7)]">
                  <div className="flex items-center justify-between gap-3 border-b border-cyan-500/10 px-5 py-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Lead detail</div>
                      <div className="mt-1 font-mono text-[11px] text-white/45">AI overview and outreach plan generated directly for this lead.</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseLeadDetailModal}
                      className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white/70 transition-colors hover:border-cyan-400/25 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-h-0 overflow-y-auto p-4">
{loadingLeadDetail ? (
                  <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-white/45">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading lead detail...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[26px] border border-cyan-400/20 bg-[linear-gradient(110deg,rgba(25,34,58,0.96),rgba(7,94,116,0.92))]">
                      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-emerald-400/20 text-emerald-200">
                            <LayoutGrid className="h-8 w-8" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-sans text-[2rem] font-semibold leading-none text-white">{selectedLeadDetail.businessName}</div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
                              {selectedLeadDetail.category ? <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1">{selectedLeadDetail.category}</span> : null}
                              {selectedLeadDetail.rating ? <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-current text-amber-300" />{selectedLeadDetail.rating} {selectedLeadDetail.reviewCount ? `(${selectedLeadDetail.reviewCount} reviews)` : ""}</span> : null}
                              <span>Scraped {formatDateTime(leadBrowserJob.createdDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCopyText(selectedLeadDetail?.outreachScript, "Outreach script copied.")}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-50 transition-colors hover:border-cyan-300/40 hover:bg-cyan-500/15"
                          >
                            <Copy className="h-4 w-4" />
                            Use in task
                          </button>
                          <span className={`rounded-xl border px-4 py-3 text-sm font-semibold ${fitBadgeClass(selectedLeadDetail.ptxFit)}`}>{detailFitLabel}</span>
                          <span className={`rounded-xl border px-4 py-3 text-sm font-semibold ${statusBadgeClass(selectedLeadDetail.status)}`}>{detailStatusLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center rounded-2xl border border-white/10 bg-black/30 p-1">
                      <button
                        type="button"
                        onClick={() => setLeadDetailTab("overview")}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${leadDetailTab === "overview" ? "bg-emerald-500/15 text-emerald-200" : "text-white/60 hover:text-white"}`}
                      >
                        Overview
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadDetailTab("outreach")}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${leadDetailTab === "outreach" ? "bg-emerald-500/15 text-emerald-200" : "text-white/60 hover:text-white"}`}
                      >
                        Outreach
                      </button>
                    </div>

                    {leadDetailTab === "overview" ? (
                      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="space-y-4">
                          <div className="rounded-[24px] border border-cyan-500/15 bg-[#081323] p-4">
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/10 p-2 text-cyan-200"><UserRound className="h-4 w-4" /></div>
                              <div>
                                <div className="font-semibold">Contact Information</div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <ContactCard icon={<UserRound className="h-4 w-4" />} label="Owner" value={detailOwnerName} />
                              <ContactCard icon={<Phone className="h-4 w-4" />} label="Phone" value={selectedLeadDetail.phone || "No phone available"} />
                              <ContactCard icon={<MapPin className="h-4 w-4" />} label="Address" value={selectedLeadDetail.address || [selectedLeadDetail.city, selectedLeadDetail.state].filter(Boolean).join(", ") || "No address available"} />
                              <ContactCard icon={<Globe className="h-4 w-4" />} label="Website" value={selectedLeadDetail.website || selectedLeadDetail.email || "No website available"} href={selectedLeadDetail.website || undefined} />
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-cyan-500/15 bg-[#081323] p-4">
                            <div className="mb-4 flex items-center gap-3 text-white">
                              <div className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/10 p-2 text-fuchsia-200"><Copy className="h-4 w-4" /></div>
                              <div className="font-semibold">Notes</div>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm leading-6 text-white/70">
                              {selectedLeadDetail.notes || selectedLeadDetail.description || "Use this space for seller notes, call findings, and objections captured after the first contact."}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-[24px] border border-cyan-500/15 bg-[#081323] p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 text-white">
                                <div className="rounded-xl border border-amber-400/15 bg-amber-500/10 p-2 text-amber-200"><Sparkles className="h-4 w-4" /></div>
                                <div className="font-semibold">PTX Insights</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right text-[11px] font-semibold text-white/55">
                                AI generation lives in Outreach
                              </div>
                            </div>
                            {autoGeneratingLeadInsights ? (
                              <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Completing missing AI fields for this lead without requiring an agent
                              </div>
                            ) : null}
                            <div className="grid gap-3 md:grid-cols-2">
                              <MiniKpiCard label="PTX fit score" value={detailFitLabel} tone={fitBadgeClass(selectedLeadDetail.ptxFit)} />
                              <MiniKpiCard label="Recommended" value={detailRecommendedProduct} tone="border-emerald-400/20 bg-emerald-500/10 text-emerald-100" />
                            </div>
                            <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">AI insight</div>
                              <div className="mt-3 text-sm leading-7 text-white/85">{detailInsightSummary}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setLeadDetailTab("outreach")}
                              className="mt-4 flex w-full items-center justify-between rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-4 text-left text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/15"
                            >
                              <span>View Outreach Scripts & Email</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-[28px] border border-cyan-500/15 bg-[linear-gradient(110deg,rgba(20,34,58,0.95),rgba(4,74,84,0.92))] p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-3xl">
                              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">Outreach command center</div>
                              <div className="mt-4 text-4xl font-semibold leading-tight text-white">Personalized outreach plan for {selectedLeadDetail.businessName}</div>
                              <div className="mt-4 max-w-3xl text-lg leading-8 text-white/86">{detailInsightSummary}</div>
                            </div>
                            <div className="space-y-3">
                              <button
                                type="button"
                                onClick={() => void handleGenerateLeadInsights()}
                                disabled={generatingLeadInsights || autoGeneratingLeadInsights}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-300/45 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {generatingLeadInsights || autoGeneratingLeadInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                {selectedLeadDetail.outreachScript || selectedLeadDetail.outreachEmailHtml ? "Regenerate AI Outreach" : "Generate AI Outreach"}
                              </button>
                              <div className="grid gap-3 md:grid-cols-3">
                                <MiniKpiCard label="Fit" value={detailFitLabel} tone={fitBadgeClass(selectedLeadDetail.ptxFit)} />
                                <MiniKpiCard label="Product" value={detailRecommendedProduct} tone="border-cyan-400/20 bg-cyan-500/10 text-cyan-50" />
                                <MiniKpiCard label="Primary CTA" value={detailPrimaryCta} tone="border-amber-400/20 bg-amber-500/10 text-amber-100" />
                              </div>
                            </div>
                          </div>

                          {autoGeneratingLeadInsights ? (
                            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating AI outreach for this lead
                            </div>
                          ) : null}

                          {leadNeedsInsights(selectedLeadDetail) && !autoGeneratingLeadInsights && !generatingLeadInsights ? (
                            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-4 text-sm leading-7 text-amber-100">
                              This lead still does not have complete AI outreach. OpenAI generation happens from this tab and the content will appear here as soon as the backend returns the script and email.
                            </div>
                          ) : null}

                          <div className="mt-6 grid gap-4 xl:grid-cols-3">
                            <PlanCard title="Best angle" content={detailCoreScript} />
                            <PlanCard title="Suggested opener" content={detailSuggestedOpener} />
                            <PlanCard title="Next step" content={detailNextStep} />
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                          <div className="space-y-4">
                            <div className="rounded-[24px] border border-cyan-500/15 bg-[#081323] p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xl font-semibold text-white">Outreach playbook</div>
                                  <div className="mt-1 text-sm text-white/45">Use this when calling, emailing, or sending a first message.</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(selectedLeadDetail?.outreachScript, "Outreach script copied.")}
                                  disabled={!selectedLeadDetail?.outreachScript?.trim()}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75 transition-colors hover:border-cyan-400/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy script
                                </button>
                              </div>
                              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.06] p-4">
                                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200">Core script</div>
                                <div className="mt-3 whitespace-pre-wrap text-lg leading-9 text-white/92">{detailCoreScript}</div>
                              </div>
                              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                                <BulletCard title="Talk track structure" bullets={detailTalkTrack} icon={<Phone className="h-4 w-4" />} />
                                <BulletCard title="Personalization cues" bullets={detailPersonalizationCues} icon={<Sparkles className="h-4 w-4" />} />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-[24px] border border-cyan-500/15 bg-[#081323] p-4">
                              <div className="text-xl font-semibold text-white">Quick actions</div>
                              <div className="mt-1 text-sm text-white/45">Launch contact channels without leaving lead detail.</div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <QuickActionButton icon={<Phone className="h-4 w-4" />} label="Call lead" href={selectedLeadDetail.phone ? `tel:${selectedLeadDetail.phone}` : undefined} />
                                <QuickActionButton icon={<Globe className="h-4 w-4" />} label="Visit website" href={selectedLeadDetail.website || undefined} />
                                <QuickActionButton icon={<Mail className="h-4 w-4" />} label="Email lead" href={selectedLeadDetail.email ? `mailto:${selectedLeadDetail.email}?subject=${encodeURIComponent(outreachEmailSubject)}` : undefined} />
                                <button
                                  type="button"
                                  onClick={() => void handleGenerateLeadInsights()}
                                  disabled={generatingLeadInsights || autoGeneratingLeadInsights}
                                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-sm font-semibold text-white/78 transition-colors hover:border-cyan-400/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />{generatingLeadInsights || autoGeneratingLeadInsights ? "Generating AI outreach" : "Regenerate AI outreach"}</span>
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="rounded-[24px] border border-cyan-500/15 bg-[#081323] p-4">
                              <div className="text-xl font-semibold text-white">Recommended sequence</div>
                              <div className="mt-1 text-sm text-white/45">Simple cadence to keep outreach organized.</div>
                              <div className="mt-4 space-y-3">
                                {detailRecommendedSequence.map((item, index) => (
                                  <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/80">{index + 1}</div>
                                    <div className="text-sm leading-7 text-white/85">{item}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-cyan-500/15 bg-[#081323] p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-xl font-semibold text-white">Outreach Email</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/30 p-1">
                                <button
                                  type="button"
                                  onClick={() => setEmailPreviewMode("preview")}
                                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${emailPreviewMode === "preview" ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white"}`}
                                >
                                  <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" />Preview</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEmailPreviewMode("html")}
                                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${emailPreviewMode === "html" ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white"}`}
                                >HTML</button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyText(selectedLeadDetail?.outreachEmailHtml, emailPreviewMode === "html" ? "HTML copied." : "Email HTML copied.")}
                                disabled={!selectedLeadDetail?.outreachEmailHtml?.trim()}
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-300/45 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <Copy className="h-4 w-4" />
                                Copy HTML
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <div className="space-y-4">
                              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.06] p-4">
                                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200">Suggested subject</div>
                                <div className="mt-3 text-2xl font-semibold leading-9 text-white">{outreachEmailSubject}</div>
                              </div>
                              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">Why this email works</div>
                                <div className="mt-3 text-base leading-8 text-white/82">The subject line stays personal and direct, while the body connects visible proof points like rating, location, and category to a concrete business value proposition.</div>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white p-4 text-[#111827] shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
                              {emailPreviewMode === "preview" ? (
                                <div className="whitespace-pre-wrap text-lg leading-9">{outreachEmailBody}</div>
                              ) : (
                                <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6">{outreachEmailHtml}</pre>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function leadNeedsInsights(lead?: LeadSummary | null) {
  if (!lead) return false;
  return !lead.ptxFit || !lead.suggestedProduct || !lead.outreachInsight || !lead.outreachScript || !lead.outreachEmailHtml;
}

function LeadInfoRow({ label, value, clamp = false }: { label: string; value?: string | null; clamp?: boolean }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/30 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">{label}</div>
      <div className={`mt-1 font-mono text-[11px] text-white/88 ${clamp ? 'truncate' : ''}`}>{value || '—'}</div>
    </div>
  );
}

function DetailBlock({ title, value, multiline = false }: { title: string; value?: string | null; multiline?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">{title}</div>
      <div className={`mt-2 font-mono text-[11px] text-white/82 ${multiline ? "whitespace-pre-wrap leading-5" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function MiniMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</div>
      <div className="mt-1 font-mono text-[11px] normal-case tracking-normal text-white/80">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</div>
      <div className="mt-2 font-mono text-lg text-white/90">{value}</div>
    </div>
  );
}


function formatFitLabel(value?: string | null) {
  const raw = (value || "medium").trim();
  if (!raw) return "Medium Fit";
  return raw.toLowerCase().includes("fit") ? raw : `${raw.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())} Fit`;
}

function formatStatusLabel(value?: string | null) {
  const raw = (value || "new").trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "New";
}

function fitBadgeClass(value?: string | null) {
  const fit = (value || "medium").toLowerCase();
  if (fit.includes("high")) return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (fit.includes("low")) return "border-rose-400/25 bg-rose-500/10 text-rose-100";
  return "border-amber-400/25 bg-amber-500/10 text-amber-100";
}

function statusBadgeClass(value?: string | null) {
  const status = (value || "new").toLowerCase();
  if (status.includes("converted")) return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (status.includes("working") || status.includes("contact")) return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
  return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
}

function deriveOwnerName(businessName?: string | null) {
  const first = (businessName || "Business").split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
  return first || "Business owner";
}

function buildCoreScript(lead?: LeadSummary | null) {
  if (!lead) return "No AI outreach script available.";
  return lead.outreachScript?.trim() || "No AI outreach script generated yet. Use Generate AI Outreach in this tab.";
}

function buildSuggestedOpener(lead?: LeadSummary | null) {
  if (!lead) return "No opener available.";
  return `Hi ${deriveOwnerName(lead.businessName)}, I was looking at ${lead.businessName}${lead.city ? ` in ${lead.city}` : ""} and noticed a strong opportunity to improve results with a very clear growth angle. I have a quick idea that could help your team get traction faster without adding complexity.`;
}

function buildNextStep(lead?: LeadSummary | null) {
  if (!lead) return "Open with a concise message, then propose a quick discovery conversation.";
  return `Open with a concise ${lead.phone ? "call or direct message" : lead.email ? "email" : "message"}, then propose a quick discovery conversation for ${lead.businessName}.`;
}

function buildTalkTrack(lead?: LeadSummary | null) {
  return [
    "Open with a relevant observation about the business, category, or local market.",
    `Connect the problem to ${lead?.suggestedProduct || "PTX Growth"} with one clear business benefit.`,
    "Use a simple proof point or reason the opportunity is timely right now.",
    "Close with one easy next step: a short intro call, email reply, or walkthrough.",
  ];
}

function buildPersonalizationCues(lead?: LeadSummary | null) {
  return [
    `Mention ${lead?.businessName || "the business"} by name and reference ${lead?.category?.toLowerCase() || "their service category"} specifically.`,
    `Use ${[lead?.city, lead?.state].filter(Boolean).join(", ") || "their local market"} as context to make the outreach feel relevant.`,
    lead?.rating ? `Reference their ${lead.rating} rating${lead.reviewCount ? ` and ${lead.reviewCount} reviews` : ""} and ask how they are turning that reputation into steady growth.` : "Reference visible proof points from reviews, website, or positioning.",
    "Note one thing from the website and connect it to the outreach angle.",
  ];
}

function buildSequence(lead?: LeadSummary | null) {
  return [
    `Day 1: Send the personalized email with the core value angle for ${lead?.businessName || "this lead"}.`,
    "Day 2: Make a quick follow-up call or send a short direct message referencing the email.",
    "Day 4: Re-engage with a tighter value proposition and a single concrete next step.",
    "Day 7: Send a final concise follow-up that lowers the commitment and keeps the door open.",
  ];
}

function buildEmailSubject(lead?: LeadSummary | null) {
  if (!lead) return "Quick growth idea";
  return `${lead.businessName}: quick idea to improve ${lead.category?.toLowerCase() || "local service"} performance`;
}

function buildEmailBody(lead?: LeadSummary | null) {
  if (!lead) return "";
  const owner = deriveOwnerName(lead.businessName);
  return `Hi ${owner},

I came across ${lead.businessName} and was impressed by ${lead.rating ? `your ${lead.rating}-star rating` : "your market presence"}${lead.reviewCount ? ` from ${lead.reviewCount} reviews` : ""}${lead.city ? `. It clearly stands out in ${lead.city}` : ""}.

We help businesses like yours turn strong reputation and local credibility into focused marketing and outreach that attracts more qualified clients. I would love to share a quick idea tailored for ${lead.businessName}.

Looking forward to connecting!

Best regards,
[Your Name]
PTX Growth Team`;
}

function buildEmailHtml(lead?: LeadSummary | null) {
  const fromBackend = lead?.outreachEmailHtml?.trim();
  if (fromBackend) return fromBackend;
  return `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#e5eef8;background:#081323;border:1px solid rgba(103,232,249,0.15);border-radius:18px;padding:24px;">
<p style="margin:0 0 12px 0;font-weight:600;">AI outreach email not generated yet.</p>
<p style="margin:0;">Use <strong>Generate AI Outreach</strong> in the Outreach tab to request the email from the backend.</p>
</div>`;
}

function ContactCard({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  const content = href ? <a href={href} target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200">{value}</a> : <span className="text-white/88">{value}</span>;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-cyan-200">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm text-white/45">{label}</div>
        <div className="mt-1 truncate text-base">{content}</div>
      </div>
    </div>
  );
}

function MiniKpiCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-semibold leading-tight">{value}</div>
    </div>
  );
}

function PlanCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">{title}</div>
      <div className="mt-4 text-lg leading-9 text-white/92">{content}</div>
    </div>
  );
}

function BulletCard({ title, bullets, icon }: { title: string; bullets: string[]; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-white">{icon}{title}</div>
      <div className="space-y-3">
        {bullets.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-3 text-base leading-8 text-white/84">
            <span className="mt-3 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionButton({ icon, label, href }: { icon: ReactNode; label: string; href?: string }) {
  const className = "flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-sm font-semibold text-white/78 transition-colors hover:border-cyan-400/25 hover:text-white";
  if (!href) {
    return <div className={`${className} opacity-50`}><span className="inline-flex items-center gap-2">{icon}{label}</span><ChevronRight className="h-4 w-4" /></div>;
  }
  return <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className={className}><span className="inline-flex items-center gap-2">{icon}{label}</span><ExternalLink className="h-4 w-4" /></a>;
}
