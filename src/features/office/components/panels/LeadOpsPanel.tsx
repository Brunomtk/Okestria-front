"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bot,
  Building2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  UserRound,
  X,
} from "lucide-react";

import type { AgentState } from "@/features/agents/state/store";
import {
  cancelLeadGenerationJob,
  cancelLeadEmailBatchJob,
  createLeadEmailBatchJob,
  createLeadGenerationJob,
  getLeadGenerationJob,
  listLeadEmailBatchJobs,
  listLeadGenerationJobs,
  listLeadsByCompany,
  listLeadsByJob,
  getLeadById,
  generateLeadInsights,
  bulkGenerateInsights,
  pollBulkInsightJob,
  sendSingleLeadEmail,
  primeLeadChat,
  primeLeadGenerationJobChat,
  type BulkGenerateInsightsResult,
  type LeadChatPrimeResult,
  type LeadEmailBatchJob,
  type LeadGenerationJob,
  type LeadSummary,
} from "@/lib/leads/lead-generation-api";
import {
  extractGatewayAgentId,
  fetchCompanyAgentDetails,
  fetchCompanyAgents,
  getBrowserAccessToken,
  getBrowserCompanyId,
} from "@/lib/agents/backend-api";
import { fetchCompanyById } from "@/lib/auth/api";

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

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  queued: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/20", dot: "bg-amber-400" },
  running: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/20", dot: "bg-cyan-400" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  failed: { bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/20", dot: "bg-rose-400" },
  cancelled: { bg: "bg-white/5", text: "text-white/50", border: "border-white/10", dot: "bg-white/40" },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

type LeadAgentOption = {
  backendAgentId: number;
  gatewayAgentId?: string | null;
  name: string;
};

type ModalView = "none" | "new-mission" | "lead-vault" | "lead-detail" | "email-batch" | "single-email";

export function LeadOpsPanel({
  agents,
  companyName,
  onSelectAgent,
}: {
  agents: AgentState[];
  companyName?: string | null;
  onSelectAgent: (agentId: string, options?: { sessionKey?: string | null }) => void;
}) {
  const companyId = getBrowserCompanyId();

  // Agent options
  const [leadAgentOptions, setLeadAgentOptions] = useState<LeadAgentOption[]>([]);
  const [selectedBackendAgentId, setSelectedBackendAgentId] = useState<number>(0);

  // Mission form
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [maxResults, setMaxResults] = useState(120);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);

  // Jobs & leads
  const [jobs, setJobs] = useState<LeadGenerationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobLeads, setJobLeads] = useState<LeadSummary[]>([]);
  const [emailBatchJobs, setEmailBatchJobs] = useState<LeadEmailBatchJob[]>([]);

  // Lead detail
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<LeadSummary | null>(null);
  const [leadDetailTab, setLeadDetailTab] = useState<"overview" | "outreach">("overview");

  // UI state
  const [modalView, setModalView] = useState<ModalView>("none");
  const [leadBrowserSearch, setLeadBrowserSearch] = useState("");
  const [leadBrowserView, setLeadBrowserView] = useState<"list" | "cards">("cards");
  const [emailPreviewMode, setEmailPreviewMode] = useState<"preview" | "html">("preview");

  // Loading states
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLeadDetail, setLoadingLeadDetail] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendingSingleEmail, setSendingSingleEmail] = useState(false);
  const [chatPriming, setChatPriming] = useState<number | "job" | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkGenerateInsightsResult | null>(null);

  // Error & refresh
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Company branding
  const [companyBrandName, setCompanyBrandName] = useState(companyName?.trim() || "");
  const [companyBrandEmail, setCompanyBrandEmail] = useState("");

  // AI provider selection — Claude as default
  const AI_PROVIDERS = [
    { value: "claude-sonnet-4-20250514", label: "Claude · Sonnet 4" },
    { value: "claude-haiku-3-5-20241022", label: "Claude · Haiku 3.5" },
    { value: "gpt-5.4-nano", label: "OpenAI · GPT-5.4 Nano" },
    { value: "gpt-4.1-mini", label: "OpenAI · GPT-4.1 Mini" },
  ];
  const [selectedAiProvider, setSelectedAiProvider] = useState(AI_PROVIDERS[0].value);

  // Email form fields
  const [emailSenderName, setEmailSenderName] = useState(companyName?.trim() || "");
  const [emailSenderAddress, setEmailSenderAddress] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState("{{businessName}} · a tailored growth idea from {{companyName}}");
  const [emailIntroText, setEmailIntroText] = useState("I asked our team at {{companyName}} to prepare a tailored outreach idea based on your business profile.");
  const [singleLeadRecipient, setSingleLeadRecipient] = useState("");
  const [singleLeadSubject, setSingleLeadSubject] = useState("");

  // Derived values
  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);
  const selectedLeadAgent = useMemo(() => leadAgentOptions.find((a) => a.backendAgentId === selectedBackendAgentId) ?? null, [leadAgentOptions, selectedBackendAgentId]);
  const effectiveCompanyName = companyBrandName.trim() || companyName?.trim() || "Your Company";
  const effectiveCompanyEmail = companyBrandEmail.trim() || emailSenderAddress.trim() || emailReplyTo.trim();

  // Filtered leads
  const filteredLeads = useMemo(() => {
    const search = leadBrowserSearch.trim().toLowerCase();
    if (!search) return jobLeads;
    return jobLeads.filter((lead) =>
      [lead.businessName, lead.category, lead.city, lead.state, lead.email, lead.website, lead.phone, lead.ptxFit]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(search))
    );
  }, [jobLeads, leadBrowserSearch]);

  // Stats
  const stats = useMemo(() => {
    const highFit = filteredLeads.filter((l) => (l.ptxFit || "").toLowerCase().includes("high")).length;
    const withEmail = filteredLeads.filter((l) => !!l.email).length;
    const withPhone = filteredLeads.filter((l) => !!l.phone).length;
    return { total: filteredLeads.length, highFit, withEmail, withPhone };
  }, [filteredLeads]);

  const globalStats = useMemo(() => {
    return jobs.reduce(
      (acc, job) => ({
        runs: acc.runs + 1,
        active: acc.active + (job.status === "running" || job.status === "queued" ? 1 : 0),
        found: acc.found + job.totalFound,
        saved: acc.saved + job.totalInserted,
      }),
      { runs: 0, active: 0, found: 0, saved: 0 }
    );
  }, [jobs]);

  // Load company brand
  useEffect(() => {
    const trimmed = companyName?.trim() || "";
    if (trimmed) {
      setCompanyBrandName(trimmed);
      setEmailSenderName((c) => (c.trim() ? c : trimmed));
    }
  }, [companyName]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!companyId) return;
      const token = getBrowserAccessToken();
      if (!token) return;
      try {
        const company = await fetchCompanyById(companyId, token);
        if (cancelled) return;
        const name = company.name?.trim() || companyName?.trim() || "";
        const email = company.email?.trim() || "";
        if (name) {
          setCompanyBrandName(name);
          setEmailSenderName((c) => (c.trim() ? c : name));
        }
        if (email) {
          setCompanyBrandEmail(email);
          setEmailSenderAddress((c) => (c.trim() ? c : email));
          setEmailReplyTo((c) => (c.trim() ? c : email));
        }
      } catch {
        // ignore
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId, companyName]);

  // Load lead agents
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!companyId) {
        setLeadAgentOptions([]);
        setSelectedBackendAgentId(0);
        return;
      }
      try {
        const summaries = await fetchCompanyAgents(companyId);
        const details = await Promise.all(
          summaries.map(async (agent) => {
            try { return await fetchCompanyAgentDetails(agent.id); } catch { return null; }
          })
        );
        if (cancelled) return;
        const options = summaries
          .map((summary, i) => {
            const detail = details[i];
            return {
              backendAgentId: detail?.id ?? summary.id,
              gatewayAgentId: detail ? extractGatewayAgentId(detail) : null,
              name: detail?.name?.trim() || detail?.slug?.trim() || summary.name?.trim() || summary.slug?.trim() || `Agent ${summary.id}`,
            } satisfies LeadAgentOption;
          })
          .filter((e, i, arr) => arr.findIndex((c) => c.backendAgentId === e.backendAgentId) === i);
        setLeadAgentOptions(options);
        setSelectedBackendAgentId((c) => (c && options.some((o) => o.backendAgentId === c) ? c : options[0]?.backendAgentId ?? 0));
      } catch {
        if (!cancelled) {
          setLeadAgentOptions([]);
          setSelectedBackendAgentId(0);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId]);

  // Load jobs
  const refreshJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const loaded = await listLeadGenerationJobs(companyId);
      const sorted = [...loaded].sort((a, b) => b.id - a.id);
      setJobs(sorted);
      setSelectedJobId((c) => c ?? sorted[0]?.id ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }, [companyId]);

  useEffect(() => { void refreshJobs(); }, [refreshJobs, refreshTick]);

  // Auto-refresh for active jobs
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "queued" || j.status === "running");
    if (!hasActive) return;
    const timer = setInterval(() => setRefreshTick((t) => t + 1), 7000);
    return () => clearInterval(timer);
  }, [jobs]);

  // Load leads for the current company, with job-specific fallback when needed.
  useEffect(() => {
    if (!companyId && !selectedJobId) {
      setJobLeads([]);
      setEmailBatchJobs([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [job, companyLeads, jobLeads] = await Promise.all([
          selectedJobId ? getLeadGenerationJob(selectedJobId) : Promise.resolve(null),
          companyId ? listLeadsByCompany(companyId) : Promise.resolve([]),
          selectedJobId ? listLeadsByJob(selectedJobId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        if (job) setJobs((c) => [job, ...c.filter((j) => j.id !== job.id)].sort((a, b) => b.id - a.id));

        const leads = companyLeads.length > 0 ? companyLeads : jobLeads;
        setJobLeads(leads);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load leads.");
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId, selectedJobId]);

  // Load email batch jobs
  useEffect(() => {
    if (!selectedJobId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const batches = await listLeadEmailBatchJobs(companyId, selectedJobId);
        if (!cancelled) setEmailBatchJobs(batches);
      } catch {
        if (!cancelled) setEmailBatchJobs([]);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId, refreshTick, selectedJobId]);

  // Load lead detail
  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLeadDetail(null);
      return;
    }
    const lead = jobLeads.find((l) => l.id === selectedLeadId);
    if (lead) setSelectedLeadDetail(lead);
    setLeadDetailTab("overview");
    let cancelled = false;
    setLoadingLeadDetail(true);
    const load = async () => {
      try {
        const detail = await getLeadById(selectedLeadId);
        if (!cancelled) setSelectedLeadDetail(detail ?? lead ?? null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingLeadDetail(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedLeadId, jobLeads]);

  // Update single email fields when lead changes
  useEffect(() => {
    if (!selectedLeadDetail) return;
    setSingleLeadRecipient(selectedLeadDetail.email?.trim() || "");
    setSingleLeadSubject(buildEmailSubject(selectedLeadDetail, effectiveCompanyName));
  }, [selectedLeadDetail?.id, selectedLeadDetail?.email, selectedLeadDetail?.businessName, effectiveCompanyName]);

  // Handlers
  const handleCreateJob = useCallback(async () => {
    if (!companyId || !selectedBackendAgentId || !query.trim()) {
      setError("Please select an agent and enter a search niche.");
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
      setJobs((c) => [{ ...created, agentName: selectedLeadAgent?.name ?? created.agentName }, ...c.filter((j) => j.id !== created.id)]);
      setSelectedJobId(created.id);
      setModalView("none");
      setQuery("");
      setRegion("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  }, [companyId, maxResults, prompt, query, region, selectedBackendAgentId, selectedLeadAgent]);

  const handleCancelJob = useCallback(async (jobId: number) => {
    await cancelLeadGenerationJob(jobId);
    setJobs((c) => c.map((j) => (j.id === jobId ? { ...j, status: "cancelled", currentStage: "Cancelled" } : j)));
  }, []);

  const handleOpenLeadVault = useCallback((jobId: number) => {
    setSelectedJobId(jobId);
    setLeadBrowserSearch("");
    setLeadBrowserView("cards");
    setSelectedLeadId(null);
    setSelectedLeadDetail(null);
    setModalView("lead-vault");
  }, []);

  const handleSelectLead = useCallback((leadId: number) => {
    setSelectedLeadId(leadId);
    setModalView("lead-detail");
  }, []);

  const handleGenerateInsights = useCallback(async () => {
    if (!selectedLeadId) return;
    setGeneratingInsights(true);
    try {
      const updated = await generateLeadInsights(selectedLeadId, null, { forceRegenerate: true, preferredModel: selectedAiProvider });
      if (updated) {
        setSelectedLeadDetail(updated);
        setJobLeads((c) => c.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate insights.");
    } finally {
      setGeneratingInsights(false);
    }
  }, [selectedLeadId, selectedAiProvider]);

  const handleBulkGenerateInsights = useCallback(async () => {
    if (!companyId || !selectedJob) return;
    setBulkGenerating(true);
    setBulkResult(null);
    setBulkProgress({ current: 0, total: jobLeads.length || selectedJob.totalInserted || 0 });
    setError(null);
    try {
      // 1. Queue the job — returns immediately with jobId
      const queued = await bulkGenerateInsights(companyId, selectedJob.id, { forceRegenerate: true, preferredModel: selectedAiProvider });
      const jobId = queued.jobId;
      if (!jobId) {
        // Fallback: old-style synchronous response (no jobId)
        setBulkResult(queued);
        setBulkProgress({ current: queued.total, total: queued.total });
        const refreshed = await listLeadsByJob(selectedJob.id);
        setJobLeads(refreshed);
        setBulkGenerating(false);
        return;
      }

      setBulkProgress({ current: 0, total: queued.total });

      // 2. Poll for progress every 2 seconds
      const poll = async (): Promise<void> => {
        for (let i = 0; i < 600; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const status = await pollBulkInsightJob(jobId);
            setBulkProgress({ current: status.processed, total: status.total });
            setBulkResult(status);

            if (status.status === "completed" || status.status === "failed") {
              if (status.errorMessage) setError(status.errorMessage);
              // Refresh lead list
              const refreshed = await listLeadsByJob(selectedJob.id);
              setJobLeads(refreshed);
              return;
            }
          } catch {
            // Polling error — keep trying
          }
        }
        setError("Bulk generation is still running in the background. Refresh the page to see updated leads.");
      };

      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start bulk insight generation.");
    } finally {
      setBulkGenerating(false);
    }
  }, [companyId, selectedJob, jobLeads.length, selectedAiProvider]);

  const handleCreateEmailBatch = useCallback(async () => {
    if (!companyId || !selectedJob) return;
    setSendingBatch(true);
    try {
      const created = await createLeadEmailBatchJob({
        companyId,
        sourceLeadJobId: selectedJob.id,
        title: `Outreach batch · ${selectedJob.title}`,
        senderName: emailSenderName.trim() || effectiveCompanyName,
        senderEmail: emailSenderAddress.trim() || effectiveCompanyEmail,
        replyTo: emailReplyTo.trim() || effectiveCompanyEmail || undefined,
        subjectTemplate: emailSubjectTemplate.trim(),
        introText: emailIntroText.trim() || undefined,
      });
      setEmailBatchJobs((c) => [created, ...c.filter((b) => b.id !== created.id)]);
      setModalView("none");
      setRefreshTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create email batch.");
    } finally {
      setSendingBatch(false);
    }
  }, [companyId, effectiveCompanyEmail, effectiveCompanyName, emailIntroText, emailReplyTo, emailSenderAddress, emailSenderName, emailSubjectTemplate, selectedJob]);

  const resolveGatewayAgentIdForLeadChat = useCallback((primeResult: LeadChatPrimeResult) => {
    const selectedOption = leadAgentOptions.find((entry) => entry.backendAgentId === primeResult.agentId);
    if (selectedOption?.gatewayAgentId) return selectedOption.gatewayAgentId;

    const normalizedSlug = primeResult.agentSlug?.trim().toLowerCase();
    if (normalizedSlug) {
      const bySlug = agents.find((agent) => agent.agentId.trim().toLowerCase() === normalizedSlug);
      if (bySlug) return bySlug.agentId;
    }

    const normalizedName = primeResult.agentName?.trim().toLowerCase();
    if (normalizedName) {
      const byName = agents.find((agent) => agent.name.trim().toLowerCase() === normalizedName);
      if (byName) return byName.agentId;
    }

    return null;
  }, [agents, leadAgentOptions]);

  const handlePrimeLeadJobChat = useCallback(async () => {
    if (!selectedJob) return;
    setError(null);
    setChatPriming("job");
    try {
      const result = await primeLeadGenerationJobChat(selectedJob.id, {
        agentId: selectedBackendAgentId > 0 ? selectedBackendAgentId : undefined,
        message: "Use this full lead generation as context. Analyze the leads, prioritize the best opportunities, and continue helping inside the chat.",
        usePersistentSession: true,
        timeoutSeconds: 120,
      });
      const gatewayAgentId = resolveGatewayAgentIdForLeadChat(result);
      if (!gatewayAgentId) {
        throw new Error(`Lead context was sent to ${result.agentName}, but the front could not map that agent to an available chat target.`);
      }
      onSelectAgent(gatewayAgentId, { sessionKey: result.sessionKey ?? null });
      setModalView("none");
      setError(result.warning?.trim() || null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to open this lead mission in chat.");
    } finally {
      setChatPriming(null);
    }
  }, [onSelectAgent, resolveGatewayAgentIdForLeadChat, selectedBackendAgentId, selectedJob]);

  const handlePrimeSelectedLeadChat = useCallback(async () => {
    if (!selectedLeadDetail) return;
    setError(null);
    setChatPriming(selectedLeadDetail.id);
    try {
      const result = await primeLeadChat(selectedLeadDetail.id, {
        agentId: selectedBackendAgentId > 0 ? selectedBackendAgentId : undefined,
        message: "Use this lead as the active context in chat. Review the business, suggest next actions, and help me work this opportunity step by step.",
        usePersistentSession: true,
        timeoutSeconds: 120,
      });
      const gatewayAgentId = resolveGatewayAgentIdForLeadChat(result);
      if (!gatewayAgentId) {
        throw new Error(`Lead context was sent to ${result.agentName}, but the front could not map that agent to an available chat target.`);
      }
      onSelectAgent(gatewayAgentId, { sessionKey: result.sessionKey ?? null });
      setModalView("none");
      setError(result.warning?.trim() || null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to open this lead in chat.");
    } finally {
      setChatPriming(null);
    }
  }, [onSelectAgent, resolveGatewayAgentIdForLeadChat, selectedBackendAgentId, selectedLeadDetail]);

  const handleSendSingleEmail = useCallback(async () => {
    if (!selectedLeadDetail) return;
    setSendingSingleEmail(true);
    try {
      const result = await sendSingleLeadEmail(selectedLeadDetail.id, {
        toEmail: singleLeadRecipient.trim() || undefined,
        subject: singleLeadSubject.trim() || undefined,
        introText: emailIntroText.trim() || undefined,
        replyTo: emailReplyTo.trim() || effectiveCompanyEmail || undefined,
        generateInsightsIfMissing: true,
        forceRegenerateInsights: false,
        preferredModel: selectedAiProvider,
      });
      setError(`Email sent to ${result.toEmail}`);
      setModalView("lead-detail");
      const refreshed = await getLeadById(selectedLeadDetail.id);
      if (refreshed) setSelectedLeadDetail(refreshed);
      setTimeout(() => setError((c) => (c === `Email sent to ${result.toEmail}` ? null : c)), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send email.");
    } finally {
      setSendingSingleEmail(false);
    }
  }, [effectiveCompanyEmail, emailIntroText, emailReplyTo, selectedLeadDetail, singleLeadRecipient, singleLeadSubject]);

  const handleCancelEmailBatch = useCallback(async (batchId: number) => {
    try {
      await cancelLeadEmailBatchJob(batchId);
      setEmailBatchJobs((c) => c.map((b) => (b.id === batchId ? { ...b, status: "cancelled", currentStage: "Cancelled" } : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel batch.");
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string | null | undefined, msg: string) => {
    if (!text || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setError(msg);
      setTimeout(() => setError((c) => (c === msg ? null : c)), 1800);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, []);

  // Outreach helpers
  const outreachData = useMemo(() => {
    if (!selectedLeadDetail) return null;
    const owner = deriveOwnerName(selectedLeadDetail.businessName);
    const fit = formatFitLabel(selectedLeadDetail.ptxFit);
    const product = selectedLeadDetail.suggestedProduct?.trim() || "PTX Growth";
    const insight = selectedLeadDetail.outreachInsight?.trim() || selectedLeadDetail.description?.trim() || `Strong local presence for ${selectedLeadDetail.businessName}.`;
    const script = selectedLeadDetail.outreachScript?.trim() || "No AI script generated yet.";
    const emailHtml = selectedLeadDetail.outreachEmailHtml?.trim() || buildEmailHtml(selectedLeadDetail, effectiveCompanyName, effectiveCompanyEmail);
    const subject = buildEmailSubject(selectedLeadDetail, effectiveCompanyName);
    const hasAi = Boolean(selectedLeadDetail.insightsGeneratedWithAi && !selectedLeadDetail.insightsUsedFallback);
    const isFallback = Boolean(selectedLeadDetail.insightsUsedFallback);
    const needsInsights = !selectedLeadDetail.ptxFit || !selectedLeadDetail.outreachScript || !selectedLeadDetail.outreachEmailHtml;
    const generationStatus = selectedLeadDetail.insightsGenerationStatus ?? null;
    const warningMessage = selectedLeadDetail.insightsWarningMessage ?? null;
    return { owner, fit, product, insight, script, emailHtml, subject, hasAi, isFallback, needsInsights, generationStatus, warningMessage };
  }, [selectedLeadDetail, effectiveCompanyName, effectiveCompanyEmail]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      {/* Header */}
      <header className="relative border-b border-white/5 px-5 py-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              <h1 className="text-sm font-semibold text-white">Lead Ops</h1>
            </div>
            <p className="mt-1 text-xs text-white/40">Prospecting missions and outreach automation</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalView("new-mission")}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50 transition hover:from-cyan-400 hover:to-cyan-500 hover:shadow-cyan-500/40"
            >
              <Plus className="h-4 w-4" />
              New Mission
            </button>
            <button
              type="button"
              onClick={() => void refreshJobs()}
              className="rounded-lg bg-white/5 p-2.5 text-white/50 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {selectedLeadAgent?.gatewayAgentId && (
              <button
                type="button"
                onClick={() => onSelectAgent(selectedLeadAgent.gatewayAgentId!)}
                className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
              >
                <Bot className="h-3.5 w-3.5" />
                Open Agent
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<Play className="h-4 w-4" />} label="Active" value={globalStats.active} accent="cyan" />
            <StatCard icon={<Target className="h-4 w-4" />} label="Runs" value={globalStats.runs} accent="white" />
            <StatCard icon={<Search className="h-4 w-4" />} label="Found" value={globalStats.found} accent="white" />
            <StatCard icon={<UserRound className="h-4 w-4" />} label="Saved" value={globalStats.saved} accent="emerald" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center justify-between rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/20">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-3 text-rose-400 hover:text-rose-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Selected Mission */}
          {selectedJob && (
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 ring-1 ring-white/5">
              <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-cyan-500 to-emerald-500" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedJob.status} />
                    <h2 className="truncate text-base font-semibold text-white">{selectedJob.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-white/50">{selectedJob.prompt || DEFAULT_PROMPT}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenLeadVault(selectedJob.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-300 ring-1 ring-cyan-500/20 transition hover:bg-cyan-500/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalView("email-batch")}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/20 transition hover:bg-emerald-500/20"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Send Batch
                  </button>
                  <select
                    value={selectedAiProvider}
                    onChange={(e) => setSelectedAiProvider(e.target.value)}
                    className="rounded-lg bg-white/5 px-2.5 py-2 text-xs font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value} className="bg-slate-900 text-slate-200">
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleBulkGenerateInsights()}
                    disabled={bulkGenerating}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 ring-1 ring-amber-500/20 transition hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    {bulkGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {bulkGenerating ? "Generating…" : "Generate All Insights"}
                  </button>
                  {(selectedJob.status === "queued" || selectedJob.status === "running") && (
                    <button
                      type="button"
                      onClick={() => void handleCancelJob(selectedJob.id)}
                      className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 ring-1 ring-rose-500/20 transition hover:bg-rose-500/20"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{selectedJob.currentStage || "Queued"}</span>
                  <span className="text-white/60">{selectedJob.progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all ${
                      selectedJob.status === "running" ? "shadow-lg shadow-cyan-500/50" : ""
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, selectedJob.progressPercent))}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label="Found" value={selectedJob.totalFound} accent="cyan" />
                <MiniStat label="Saved" value={selectedJob.totalInserted} accent="emerald" />
                <MiniStat label="Enriched" value={selectedJob.totalEnriched} accent="amber" />
                <MiniStat label="Duplicates" value={selectedJob.totalDuplicates} accent="white" />
              </div>

              {/* Bulk Insights Progress */}
              {(bulkGenerating || bulkResult) && (
                <div className="mt-5 rounded-xl bg-amber-500/5 p-4 ring-1 ring-amber-500/15 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {bulkGenerating && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
                      <span className="text-xs font-medium text-amber-300">
                        {bulkGenerating
                          ? bulkResult?.status === "queued"
                            ? "Queuing insight generation…"
                            : `Generating insights — ${bulkProgress?.current ?? 0} of ${bulkProgress?.total ?? 0} leads`
                          : bulkResult?.status === "failed"
                            ? "Generation failed"
                            : "Generation complete"}
                      </span>
                    </div>
                    {!bulkGenerating && bulkResult && (
                      <button type="button" onClick={() => setBulkResult(null)} className="text-xs text-white/30 hover:text-white/60">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {bulkProgress && bulkProgress.total > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/40">
                          {bulkResult?.currentLeadName
                            ? `Processing: ${bulkResult.currentLeadName}`
                            : bulkGenerating ? "Processing…" : "Done"}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400/80">
                          {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(2, Math.round((bulkProgress.current / bulkProgress.total) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  {bulkResult && (bulkResult.processed > 0 || !bulkGenerating) && (
                    <div className="grid grid-cols-5 gap-2">
                      <div className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
                        <div className="text-sm font-semibold text-white">{bulkResult.total}</div>
                        <div className="text-[10px] text-white/40">Total</div>
                      </div>
                      <div className="rounded-lg bg-violet-500/10 px-2 py-1.5 text-center">
                        <div className="text-sm font-semibold text-violet-400">{bulkResult.processed}</div>
                        <div className="text-[10px] text-violet-400/60">Processed</div>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-center">
                        <div className="text-sm font-semibold text-emerald-400">{bulkResult.succeeded}</div>
                        <div className="text-[10px] text-emerald-400/60">AI Generated</div>
                      </div>
                      <div className="rounded-lg bg-cyan-500/10 px-2 py-1.5 text-center">
                        <div className="text-sm font-semibold text-cyan-400">{bulkResult.skipped}</div>
                        <div className="text-[10px] text-cyan-400/60">Skipped</div>
                      </div>
                      <div className="rounded-lg bg-rose-500/10 px-2 py-1.5 text-center">
                        <div className="text-sm font-semibold text-rose-400">{bulkResult.failed}</div>
                        <div className="text-[10px] text-rose-400/60">Failed</div>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {bulkResult?.errorMessage && (
                    <div className="text-xs text-rose-400/80">{bulkResult.errorMessage}</div>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/35">
                <span>Agent: <span className="text-white/60">{selectedJob.agentName || selectedJob.agentId}</span></span>
                <span>Started: <span className="text-white/60">{formatDateTime(selectedJob.startedAtUtc || selectedJob.createdDate)}</span></span>
                {selectedJob.finishedAtUtc && (
                  <span>Finished: <span className="text-white/60">{formatDateTime(selectedJob.finishedAtUtc)}</span></span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handlePrimeLeadJobChat()}
                  disabled={chatPriming === "job" || leadAgentOptions.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 ring-1 ring-violet-500/25 transition hover:bg-violet-500/25 disabled:opacity-50"
                >
                  {chatPriming === "job" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Use mission in chat
                </button>
                <div className="text-xs text-white/35">
                  Sends the full generation context to the selected agent and opens the chat session.
                </div>
              </div>

              {/* Email Batches */}
              {emailBatchJobs.length > 0 && (
                <div className="mt-5 rounded-xl bg-emerald-500/5 p-4 ring-1 ring-emerald-500/10">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                    <Mail className="h-3.5 w-3.5" />
                    Email Batches ({emailBatchJobs.length})
                  </div>
                  <div className="mt-3 space-y-2">
                    {emailBatchJobs.slice(0, 3).map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-white/70">{batch.title}</div>
                          <div className="mt-0.5 text-xs text-white/35">
                            {batch.totalSent}/{batch.totalEligible} sent
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={batch.status} size="sm" />
                          {(batch.status === "queued" || batch.status === "running") && (
                            <button
                              type="button"
                              onClick={() => void handleCancelEmailBatch(batch.id)}
                              className="text-xs text-rose-300 hover:text-rose-200"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.errorMessage && (
                <div className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {selectedJob.errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Recent Missions */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 ring-1 ring-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/70">Recent Missions</h3>
              <span className="text-xs text-white/30">{jobs.length} total</span>
            </div>

            {loadingJobs ? (
              <div className="flex items-center gap-2 py-8 text-sm text-white/40">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/30">
                No missions yet. Click <span className="text-cyan-400">New Mission</span> to start.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {jobs.map((job) => {
                  const isSelected = selectedJobId === job.id;
                  const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                  return (
                    <div
                      key={job.id}
                      className={`relative cursor-pointer rounded-xl p-4 transition ${
                        isSelected
                          ? "bg-cyan-500/10 ring-1 ring-cyan-500/30"
                          : "bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-white/10"
                      }`}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-cyan-500/60 to-emerald-500/40 opacity-0 transition-opacity group-hover:opacity-100" style={{ opacity: isSelected ? 0.8 : 0 }} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                            <span className="truncate text-sm font-medium text-white">{job.title}</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-white/40">{job.query}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium uppercase ${config.bg} ${config.text}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-white/30">
                        <span>{job.totalInserted} leads saved</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenLeadVault(job.id); }}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                        >
                          View <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                          style={{ width: `${Math.min(100, job.progressPercent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== MODALS ====== */}

      {/* New Mission Modal */}
      {modalView === "new-mission" && (
        <Modal onClose={() => setModalView("none")} title="New Lead Mission" subtitle="Configure your prospecting run">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Agent</label>
                <div className="relative">
                  <select
                    value={selectedBackendAgentId || ""}
                    onChange={(e) => setSelectedBackendAgentId(Number(e.target.value) || 0)}
                    className="w-full appearance-none rounded-lg bg-white/5 px-3 py-2.5 pr-10 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-cyan-500/50 transition"
                  >
                    {leadAgentOptions.length === 0 && (
                      <option value="" style={{ color: "#0f172a", backgroundColor: "#f8fafc" }}>
                        No agents
                      </option>
                    )}
                    {leadAgentOptions.map((a) => (
                      <option
                        key={a.backendAgentId}
                        value={a.backendAgentId}
                        style={{ color: "#0f172a", backgroundColor: "#f8fafc" }}
                      >
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Region</label>
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="City, State or Country"
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Search Niche</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Dental clinics, Law firms, Med spas"
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {LEAD_NICHE_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setQuery(ex)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      query.toLowerCase() === ex.toLowerCase()
                        ? "bg-cyan-500/30 text-cyan-200 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-500/20"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 ring-1 ring-white/10"
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-xs font-medium text-white/50">Max Leads</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-cyan-400">{maxResults}</span>
                  <span className="text-xs text-white/40">leads</span>
                </div>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="mt-2 flex justify-between text-[10px] text-white/30">
                <span>10</span>
                <span>250</span>
                <span>500</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Mission Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalView("none")}
              className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateJob}
              disabled={submitting || !query.trim() || leadAgentOptions.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Mission
            </button>
          </div>
        </Modal>
      )}

      {/* Lead Vault Modal */}
      {modalView === "lead-vault" && (
        <Modal
          onClose={() => setModalView("none")}
          title={selectedJob ? `${selectedJob.title} · Company Leads` : "Company Leads"}
          subtitle={`${stats.total} leads available for this company`}
          size="xl"
        >
          {/* Search & View Toggle */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/10 focus-within:ring-cyan-500/50 transition">
              <Search className="h-4 w-4 text-white/40" />
              <input
                value={leadBrowserSearch}
                onChange={(e) => setLeadBrowserSearch(e.target.value)}
                placeholder="Search leads..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
            <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
              <button
                type="button"
                onClick={() => setLeadBrowserView("list")}
                className={`rounded px-3 py-1.5 transition ${leadBrowserView === "list" ? "bg-white/20 text-white font-medium" : "text-white/50 hover:text-white"}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLeadBrowserView("cards")}
                className={`rounded px-3 py-1.5 transition ${leadBrowserView === "cards" ? "bg-white/20 text-white font-medium" : "text-white/50 hover:text-white"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mb-5 grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-white/5 px-3 py-2.5 text-center ring-1 ring-white/10">
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-[10px] uppercase text-white/35 font-medium">Total</div>
            </div>
            <div className="rounded-lg bg-emerald-500/10 px-3 py-2.5 text-center ring-1 ring-emerald-500/20">
              <div className="text-lg font-bold text-emerald-400">{stats.highFit}</div>
              <div className="text-[10px] uppercase text-emerald-400/60 font-medium">High Fit</div>
            </div>
            <div className="rounded-lg bg-cyan-500/10 px-3 py-2.5 text-center ring-1 ring-cyan-500/20">
              <div className="text-lg font-bold text-cyan-400">{stats.withEmail}</div>
              <div className="text-[10px] uppercase text-cyan-400/60 font-medium">With Email</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 px-3 py-2.5 text-center ring-1 ring-amber-500/20">
              <div className="text-lg font-bold text-amber-400">{stats.withPhone}</div>
              <div className="text-[10px] uppercase text-amber-400/60 font-medium">With Phone</div>
            </div>
          </div>

          {/* Lead List */}
          <div className="max-h-[50vh] overflow-y-auto rounded-xl ring-1 ring-white/5">
            {leadBrowserView === "list" ? (
              <div className="divide-y divide-white/5">
                {filteredLeads.map((lead, idx) => (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead.id)}
                    className={`flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-white/[0.05] ${
                      idx % 2 === 1 ? "bg-white/[0.015]" : ""
                    }`}
                  >
                    {/* Business Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-white">{lead.businessName}</span>
                        <FitBadge fit={lead.ptxFit} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                        {(lead.city || lead.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[lead.city, lead.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {lead.category && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {lead.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Icons */}
                    <div className="flex shrink-0 items-center gap-2">
                      {lead.email && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10">
                          <Mail className="h-3.5 w-3.5 text-cyan-400" />
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
                          <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        </span>
                      )}
                      {lead.website && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5">
                          <Globe className="h-3.5 w-3.5 text-white/50" />
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead.id)}
                    className="cursor-pointer rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5 transition hover:bg-white/[0.06] hover:ring-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-white">{lead.businessName}</div>
                        <div className="mt-0.5 truncate text-xs text-white/40">
                          {[lead.city, lead.state].filter(Boolean).join(", ") || lead.category || "-"}
                        </div>
                      </div>
                      <FitBadge fit={lead.ptxFit} />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-cyan-400" /> Email</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-emerald-400" /> Phone</span>}
                      {lead.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Web</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Lead Detail Modal */}
      {modalView === "lead-detail" && selectedLeadDetail && outreachData && (
        <Modal
          onClose={() => { setModalView("lead-vault"); setSelectedLeadId(null); }}
          title={selectedLeadDetail.businessName}
          subtitle={[selectedLeadDetail.city, selectedLeadDetail.state].filter(Boolean).join(", ") || selectedLeadDetail.category || "Lead Details"}
          size="lg"
        >
          {/* Tabs */}
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setLeadDetailTab("overview")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                leadDetailTab === "overview" ? "bg-white/20 text-white shadow-lg shadow-white/10" : "text-white/50 hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setLeadDetailTab("outreach")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                leadDetailTab === "outreach" ? "bg-white/20 text-white shadow-lg shadow-white/10" : "text-white/50 hover:text-white"
              }`}
            >
              Outreach
            </button>
          </div>

          {loadingLeadDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : leadDetailTab === "overview" ? (
            <div className="space-y-5">
              {/* Contact Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedLeadDetail.email && (
                  <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={selectedLeadDetail.email} href={`mailto:${selectedLeadDetail.email}`} color="cyan" />
                )}
                {selectedLeadDetail.phone && (
                  <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={selectedLeadDetail.phone} href={`tel:${selectedLeadDetail.phone}`} color="emerald" />
                )}
                {selectedLeadDetail.website && (
                  <ContactRow icon={<Globe className="h-4 w-4" />} label="Website" value={selectedLeadDetail.website.replace(/^https?:\/\//, "")} href={selectedLeadDetail.website} color="amber" />
                )}
                {selectedLeadDetail.address && (
                  <ContactRow icon={<MapPin className="h-4 w-4" />} label="Address" value={selectedLeadDetail.address} color="white" />
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-white">{outreachData.fit}</div>
                  <div className="mt-1 text-xs uppercase text-white/40">PTX Fit</div>
                </div>
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-white">{selectedLeadDetail.rating || "-"}</div>
                  <div className="mt-1 text-xs uppercase text-white/40">Rating</div>
                </div>
                <div className="rounded-xl bg-white/5 p-4 text-center">
                  <div className="text-2xl font-bold text-white">{selectedLeadDetail.reviewCount || "-"}</div>
                  <div className="mt-1 text-xs uppercase text-white/40">Reviews</div>
                </div>
              </div>

              {/* Insight */}
              <div className="relative overflow-hidden rounded-xl bg-cyan-500/5 p-4 ring-1 ring-cyan-500/10">
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(34, 211, 238, 0.1), transparent)" }} />
                <div className="relative mb-2 flex items-center gap-2 text-xs font-medium text-cyan-300">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  AI Insight
                  {outreachData.hasAi && (
                    <span className="ml-auto rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                      Generated by AI
                    </span>
                  )}
                  {outreachData.isFallback && (
                    <span className="ml-auto rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                      Fallback — AI unavailable
                    </span>
                  )}
                  {!outreachData.hasAi && !outreachData.isFallback && outreachData.generationStatus && (
                    <span className="ml-auto rounded-full bg-slate-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 ring-1 ring-slate-500/30">
                      Not generated yet
                    </span>
                  )}
                </div>
                <p className="relative text-sm leading-relaxed text-white/80">{outreachData.insight}</p>
                {outreachData.warningMessage && (
                  <p className="mt-2 text-xs text-amber-400/80">{outreachData.warningMessage}</p>
                )}
              </div>

              {/* Recommended Product */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 p-4 ring-1 ring-emerald-500/10">
                <div>
                  <div className="text-xs uppercase text-emerald-400/60">Recommended Product</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-400">{outreachData.product}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeadDetailTab("outreach")}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/25 transition hover:bg-emerald-500/25"
                >
                  View Outreach <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-violet-500/5 p-4 ring-1 ring-violet-500/10">
                <button
                  type="button"
                  onClick={() => void handlePrimeSelectedLeadChat()}
                  disabled={chatPriming === selectedLeadDetail.id || leadAgentOptions.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 ring-1 ring-violet-500/25 transition hover:bg-violet-500/25 disabled:opacity-50"
                >
                  {chatPriming === selectedLeadDetail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Use this lead in chat
                </button>
                <div className="text-xs text-white/45">
                  Opens the selected agent chat already primed with this lead context.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* AI Status + Generate */}
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      {outreachData.hasAi ? "AI Outreach Ready" : outreachData.isFallback ? "Fallback Outreach" : outreachData.needsInsights ? "Generate AI Outreach" : "Outreach Available"}
                      {outreachData.hasAi && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                          AI
                        </span>
                      )}
                      {outreachData.isFallback && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                          Fallback
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">
                      {outreachData.hasAi
                        ? "Personalized script and email generated by AI"
                        : outreachData.isFallback
                          ? "AI was unavailable — using rule-based content. Try regenerating."
                          : "Select a provider and click Generate"}
                    </div>
                    {outreachData.warningMessage && (
                      <div className="mt-1 text-xs text-amber-400/80">{outreachData.warningMessage}</div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedAiProvider}
                    onChange={(e) => setSelectedAiProvider(e.target.value)}
                    className="rounded-lg bg-white/5 px-2.5 py-2 text-xs font-medium text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value} className="bg-slate-900 text-slate-200">
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateInsights}
                    disabled={generatingInsights}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      outreachData.needsInsights || outreachData.isFallback
                        ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40 hover:bg-cyan-500/30 animate-pulse"
                        : "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/25 hover:bg-cyan-500/25"
                    } disabled:opacity-50`}
                  >
                    {generatingInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {generatingInsights ? "Generating…" : outreachData.hasAi ? "Regenerate" : "Generate with AI"}
                  </button>
                </div>
              </div>

              {/* Script */}
              <div className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    Outreach Script
                    {outreachData.hasAi && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">AI</span>}
                    {outreachData.isFallback && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">Fallback</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(outreachData.script, "Script copied!")}
                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{outreachData.script}</p>
              </div>

              {/* Email Preview */}
              <div className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    Email Preview
                    {outreachData.hasAi && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">AI</span>}
                    {outreachData.isFallback && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">Fallback</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
                      <button
                        type="button"
                        onClick={() => setEmailPreviewMode("preview")}
                        className={`rounded px-2.5 py-1.5 text-xs transition ${emailPreviewMode === "preview" ? "bg-white/20 text-white font-medium" : "text-white/50 hover:text-white"}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailPreviewMode("html")}
                        className={`rounded px-2.5 py-1.5 text-xs transition ${emailPreviewMode === "html" ? "bg-white/20 text-white font-medium" : "text-white/50 hover:text-white"}`}
                      >
                        HTML
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(outreachData.emailHtml, "HTML copied!")}
                      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 text-slate-900 shadow-lg ring-1 ring-black/10">
                  {emailPreviewMode === "preview" ? (
                    <div dangerouslySetInnerHTML={{ __html: outreachData.emailHtml }} className="text-sm" />
                  ) : (
                    <pre className="overflow-x-auto text-xs font-mono">{outreachData.emailHtml}</pre>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid gap-3 sm:grid-cols-3">
                {selectedLeadDetail.phone && (
                  <a
                    href={`tel:${selectedLeadDetail.phone}`}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/25 transition hover:bg-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setModalView("single-email")}
                  className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/25 transition hover:bg-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/20"
                >
                  <Send className="h-4 w-4" /> Send Email
                </button>
                {selectedLeadDetail.website && (
                  <a
                    href={selectedLeadDetail.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-300 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 hover:shadow-lg hover:shadow-amber-500/20"
                  >
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Email Batch Modal */}
      {modalView === "email-batch" && selectedJob && (
        <Modal onClose={() => setModalView("none")} title="Send Batch Email" subtitle={`Queue outreach for ${selectedJob.title}`}>
          <div className="space-y-4">
            <div className="rounded-lg bg-cyan-500/10 px-3 py-2.5 text-sm text-white/70 ring-1 ring-cyan-500/20">
              <div className="mb-2 font-medium text-white/80">Supported tokens:</div>
              <div className="flex flex-wrap gap-2">
                {["{{businessName}}", "{{city}}", "{{ownerName}}", "{{companyName}}"].map((token) => (
                  <code key={token} className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-mono text-cyan-300 ring-1 ring-cyan-500/30">
                    {token}
                  </code>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Sender Name</label>
                <input
                  value={emailSenderName}
                  onChange={(e) => setEmailSenderName(e.target.value)}
                  placeholder={effectiveCompanyName}
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Sender Email</label>
                <input
                  value={emailSenderAddress}
                  onChange={(e) => setEmailSenderAddress(e.target.value)}
                  placeholder={effectiveCompanyEmail || "company@domain.com"}
                  className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Reply-To</label>
              <input
                value={emailReplyTo}
                onChange={(e) => setEmailReplyTo(e.target.value)}
                placeholder={effectiveCompanyEmail || "reply@domain.com"}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Subject Template</label>
              <input
                value={emailSubjectTemplate}
                onChange={(e) => setEmailSubjectTemplate(e.target.value)}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Intro Text</label>
              <textarea
                value={emailIntroText}
                onChange={(e) => setEmailIntroText(e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalView("none")}
              className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateEmailBatch}
              disabled={sendingBatch}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50 transition hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/40 disabled:opacity-50"
            >
              {sendingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Queue Batch
            </button>
          </div>
        </Modal>
      )}

      {/* Single Email Modal */}
      {modalView === "single-email" && selectedLeadDetail && (
        <Modal onClose={() => setModalView("lead-detail")} title="Send Email" subtitle={`To ${selectedLeadDetail.businessName}`}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Recipient</label>
              <input
                value={singleLeadRecipient}
                onChange={(e) => setSingleLeadRecipient(e.target.value)}
                placeholder={selectedLeadDetail.email || "email@example.com"}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Subject</label>
              <input
                value={singleLeadSubject}
                onChange={(e) => setSingleLeadSubject(e.target.value)}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Reply-To</label>
              <input
                value={emailReplyTo}
                onChange={(e) => setEmailReplyTo(e.target.value)}
                placeholder={effectiveCompanyEmail || "reply@domain.com"}
                className="w-full rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-cyan-500/50 transition"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalView("lead-detail")}
              className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendSingleEmail}
              disabled={sendingSingleEmail || !singleLeadRecipient.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50 transition hover:from-cyan-400 hover:to-cyan-500 hover:shadow-cyan-500/40 disabled:opacity-50"
            >
              {sendingSingleEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Now
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ====== COMPONENTS ======

function Modal({ children, onClose, title, subtitle, size = "md" }: { children: ReactNode; onClose: () => void; title: string; subtitle?: string; size?: "md" | "lg" | "xl" }) {
  const widthClass = size === "xl" ? "max-w-5xl" : size === "lg" ? "max-w-3xl" : "max-w-xl";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`relative w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 p-6 shadow-2xl ring-1 ring-white/10`}>
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent = "white" }: { icon: ReactNode; label: string; value: number; accent?: "cyan" | "emerald" | "white" }) {
  const accentClass = accent === "cyan" ? "text-cyan-400" : accent === "emerald" ? "text-emerald-400" : "text-white";
  return (
    <div className="rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/5 transition hover:bg-white/[0.04] hover:ring-white/10 cursor-pointer">
      <div className="flex items-center gap-2 text-white/40">
        {icon}
        <span className="text-xs uppercase font-medium">{label}</span>
      </div>
      <div className={`mt-3 text-3xl font-bold ${accentClass}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, accent = "white" }: { label: string; value: number; accent?: "cyan" | "emerald" | "amber" | "white" }) {
  const accentBg = accent === "cyan" ? "bg-cyan-500/10" : accent === "emerald" ? "bg-emerald-500/10" : accent === "amber" ? "bg-amber-500/10" : "bg-white/5";
  const accentRing = accent === "cyan" ? "ring-cyan-500/20" : accent === "emerald" ? "ring-emerald-500/20" : accent === "amber" ? "ring-amber-500/20" : "ring-white/10";
  const accentText = accent === "cyan" ? "text-cyan-400" : accent === "emerald" ? "text-emerald-400" : accent === "amber" ? "text-amber-400" : "text-white";
  return (
    <div className={`rounded-lg ${accentBg} px-3 py-2.5 text-center ring-1 ${accentRing}`}>
      <div className={`text-xl font-bold ${accentText}`}>{value}</div>
      <div className="text-[10px] uppercase text-white/35 font-medium">{label}</div>
    </div>
  );
}

function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1.5 text-[10px]";
  const isRunning = status === "running";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase ${sizeClass} ${config.bg} ${config.text} ${config.border} border ${
      isRunning ? "animate-pulse" : ""
    }`}>
      <span className={`h-2 w-2 rounded-full ${config.dot} ${isRunning ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

function FitBadge({ fit }: { fit?: string | null }) {
  const value = (fit || "medium").toLowerCase();
  const isHigh = value.includes("high");
  const isLow = value.includes("low");
  const colorClass = isHigh ? "bg-emerald-500/25 text-emerald-300 ring-emerald-500/40" : isLow ? "bg-rose-500/25 text-rose-300 ring-rose-500/40" : "bg-amber-500/25 text-amber-300 ring-amber-500/40";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ring-1 ${colorClass}`}>
      {isHigh ? "High" : isLow ? "Low" : "Medium"}
    </span>
  );
}

function ContactRow({ icon, label, value, href, color = "white" }: { icon: ReactNode; label: string; value: string; href?: string; color?: "cyan" | "emerald" | "amber" | "white" }) {
  const bgClass = color === "cyan" ? "bg-cyan-500/10" : color === "emerald" ? "bg-emerald-500/10" : color === "amber" ? "bg-amber-500/10" : "bg-white/5";
  const textClass = color === "cyan" ? "text-cyan-300" : color === "emerald" ? "text-emerald-300" : color === "amber" ? "text-amber-300" : "text-white/50";
  const linkClass = color === "cyan" ? "text-cyan-400 hover:text-cyan-300" : color === "emerald" ? "text-emerald-400 hover:text-emerald-300" : color === "amber" ? "text-amber-400 hover:text-amber-300" : "text-white/80";
  const content = href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className={linkClass}>
      {value}
    </a>
  ) : (
    <span className="text-white/80">{value}</span>
  );
  return (
    <div className={`flex items-center gap-3 rounded-lg ${bgClass} p-3 ring-1 ring-white/5`}>
      <div className={`rounded-lg ${bgClass} p-2.5 ${textClass}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase text-white/35 font-medium">{label}</div>
        <div className="truncate text-sm">{content}</div>
      </div>
    </div>
  );
}

// ====== HELPERS ======

function formatFitLabel(value?: string | null) {
  const raw = (value || "medium").trim();
  if (!raw) return "Medium Fit";
  return raw.toLowerCase().includes("fit") ? raw : `${raw.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())} Fit`;
}

function deriveOwnerName(businessName?: string | null) {
  const first = (businessName || "Business").split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
  return first || "Business owner";
}

function buildEmailSubject(lead?: LeadSummary | null, companyName?: string) {
  if (!lead) return `A quick growth idea from ${companyName || "your team"}`;
  return `${lead.businessName} · a sharper outreach idea from ${companyName || "your team"}`;
}

function escapeHtml(value?: string | null) {
  return (value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function buildEmailHtml(lead?: LeadSummary | null, companyName?: string, companyEmail?: string) {
  const senderName = companyName?.trim() || "Your Company";
  const senderEmail = companyEmail?.trim();
  const owner = deriveOwnerName(lead?.businessName);
  const businessName = lead?.businessName || "your business";
  const categoryLabel = lead?.category?.toLowerCase() || "local service";
  const locationLabel = [lead?.city, lead?.state].filter(Boolean).join(", ") || "your market";
  const ctaHref = senderEmail ? `mailto:${escapeHtml(senderEmail)}?subject=${encodeURIComponent(`A quick idea for ${businessName}`)}` : "#";

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#e8f2ff;line-height:1.7;padding:24px;">
  <p>Hi ${escapeHtml(owner)},</p>
  <p>I came across ${escapeHtml(businessName)} while looking at ${escapeHtml(categoryLabel)} businesses in ${escapeHtml(locationLabel)} and wanted to reach out. I think there's a great opportunity to help your team capture and follow up with leads faster using a simple AI-powered workflow.</p>
  <p>We've been helping similar businesses respond to new opportunities quicker and keep their pipeline organized — without adding extra manual work.</p>
  <p>Would you be open to a quick chat so I can show you how it could work for ${escapeHtml(businessName)}?</p>
  <p>Best,<br/>${escapeHtml(senderName)}${senderEmail ? `<br/><a href="${ctaHref}" style="color:#2dd4bf;text-decoration:none;">${escapeHtml(senderEmail)}</a>` : ""}</p>
</div>`;
}
