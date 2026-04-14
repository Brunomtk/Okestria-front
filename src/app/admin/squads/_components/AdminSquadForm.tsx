'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Crown,
  Layers,
  Save,
  Search,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OkestriaCompany, OkestriaSquadCatalog, OkestriaSquadDetails } from '@/lib/auth/api';

type CompanyOption = Pick<OkestriaCompany, 'id' | 'name'>;

type AdminSquadFormProps = {
  mode: 'create' | 'edit';
  companies: CompanyOption[];
  catalogs: Record<number, OkestriaSquadCatalog>;
  squad?: OkestriaSquadDetails | null;
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
};

const executionModeOptions = [
  { value: 'manual', label: 'Manual', icon: '🎯', description: 'Você decide quando e quem executa.' },
  { value: 'leader', label: 'Leader', icon: '👑', description: 'O agent líder distribui as tarefas.' },
  { value: 'all', label: 'Todos', icon: '🔄', description: 'Todos os membros recebem a task.' },
  { value: 'workflow', label: 'Workflow', icon: '📋', description: 'Execução sequencial por etapas.' },
] as const;

const inputClass = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground';
const selectClass = `${inputClass} cursor-pointer appearance-none`;
const labelClass = 'text-sm font-medium text-foreground';

export default function AdminSquadForm({ mode, companies, catalogs, squad, action, cancelHref }: AdminSquadFormProps) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const initialCompanyId = squad?.companyId ?? companies[0]?.id ?? 0;
  const [companyId, setCompanyId] = useState<number>(initialCompanyId);
  const [leaderAgentId, setLeaderAgentId] = useState<number>(squad?.leaderAgentId ?? 0);
  const [workspaceId, setWorkspaceId] = useState<number>(squad?.workspaceId ?? 0);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(
    squad?.members
      ?.map((m) => m.agentId)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v)) ?? [],
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(urlError ?? null);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(null), 8000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  const catalog = catalogs[companyId] ?? { companyId, agents: [], workspaces: [] };

  const agents = useMemo(
    () => [...(catalog.agents ?? [])].sort((a, b) => Number(b.status) - Number(a.status) || (a.agentName ?? '').localeCompare(b.agentName ?? '')),
    [catalog.agents],
  );

  const workspaces = useMemo(
    () => [...(catalog.workspaces ?? [])].sort((a, b) => Number(b.status) - Number(a.status) || (a.workspaceName ?? '').localeCompare(b.workspaceName ?? '')),
    [catalog.workspaces],
  );

  const filteredAgents = useMemo(() => {
    if (!memberSearch.trim()) return agents;
    const q = memberSearch.toLowerCase();
    return agents.filter(
      (a) =>
        (a.agentName ?? '').toLowerCase().includes(q) ||
        (a.agentSlug ?? '').toLowerCase().includes(q) ||
        (a.role ?? '').toLowerCase().includes(q),
    );
  }, [agents, memberSearch]);

  const selectedMembers = useMemo(
    () => agents.filter((a) => selectedMemberIds.includes(a.agentId)),
    [agents, selectedMemberIds],
  );

  useEffect(() => {
    if (leaderAgentId > 0 && !selectedMemberIds.includes(leaderAgentId)) {
      setLeaderAgentId(selectedMemberIds[0] ?? 0);
    }
  }, [leaderAgentId, selectedMemberIds]);

  const toggleMember = useCallback((agentId: number) => {
    setSelectedMemberIds((current) =>
      current.includes(agentId) ? current.filter((v) => v !== agentId) : [...current, agentId],
    );
  }, []);

  const handleCompanyChange = (value: string) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    setCompanyId(next);
    setSelectedMemberIds([]);
    setLeaderAgentId(0);
    setWorkspaceId(0);
  };

  const handleSubmit = (formData: FormData) => {
    if (!selectedMemberIds.length) {
      setErrorMessage('Selecione pelo menos um membro para o squad.');
      return;
    }
    if (!leaderAgentId || leaderAgentId <= 0) {
      setErrorMessage('Selecione o agent líder do squad.');
      return;
    }
    setErrorMessage(null);
    action(formData);
  };

  const canSubmit = selectedMemberIds.length > 0 && leaderAgentId > 0;

  return (
    <form action={handleSubmit} className="space-y-6 max-w-6xl">
      {squad?.id ? <input type="hidden" name="squadId" value={squad.id} /> : null}

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="shrink-0 rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Section 1: Dados principais */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Dados principais
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Identificação, workspace e modo de execução.</p>
        </div>
        <div className="p-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2 block">
              <span className={labelClass}>Company <span className="text-destructive">*</span></span>
              <div className="relative">
                <select name="companyId" value={String(companyId || '')} onChange={(e) => handleCompanyChange(e.target.value)} className={selectClass}>
                  <option value="">Selecione...</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name ?? `Company #${c.id}`}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>

            <label className="space-y-2 block">
              <span className={labelClass}>Nome <span className="text-destructive">*</span></span>
              <input name="name" required defaultValue={squad?.name ?? ''} placeholder="Ex.: Squad Comercial" className={inputClass} />
            </label>

            <label className="space-y-2 block">
              <span className={labelClass}>Slug</span>
              <input name="slug" defaultValue={squad?.slug ?? ''} placeholder="squad-comercial (auto)" className={inputClass} />
            </label>

            <label className="space-y-2 block">
              <span className={labelClass}>Workspace</span>
              <div className="relative">
                <select name="workspaceId" value={String(workspaceId || '')} onChange={(e) => setWorkspaceId(Number(e.target.value) || 0)} className={selectClass}>
                  <option value="">Sem vínculo</option>
                  {workspaces.map((ws) => (
                    <option key={ws.workspaceId} value={ws.workspaceId}>
                      {ws.workspaceName ?? `Workspace #${ws.workspaceId}`}{ws.status ? '' : ' · inativo'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>

            <label className="space-y-2 block">
              <span className={labelClass}>Leader <span className="text-destructive">*</span></span>
              <div className="relative">
                <select name="leaderAgentId" value={String(leaderAgentId || '')} onChange={(e) => setLeaderAgentId(Number(e.target.value) || 0)} className={selectClass}>
                  <option value="">{selectedMemberIds.length > 0 ? 'Selecione o líder...' : 'Selecione membros primeiro'}</option>
                  {selectedMembers.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.agentName ?? `Agent #${a.agentId}`}{a.role ? ` · ${a.role}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              {selectedMemberIds.length > 0 && !leaderAgentId && (
                <p className="text-xs text-amber-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Selecione um líder.</p>
              )}
            </label>

            <label className="space-y-2 block">
              <span className={labelClass}>Status</span>
              <div className="relative">
                <select name="status" defaultValue={(squad?.status ?? squad?.isActive ?? true) ? 'true' : 'false'} className={selectClass}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>

            <label className="space-y-2 block xl:col-span-3">
              <span className={labelClass}>Descrição</span>
              <textarea
                name="description"
                defaultValue={squad?.description ?? ''}
                placeholder="Explique de forma curta a responsabilidade do squad..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground resize-none"
              />
            </label>
          </div>

          {/* Execution mode cards */}
          <div className="mt-5">
            <span className={`${labelClass} block mb-3`}>Modo de execução padrão</span>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {executionModeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="relative flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3.5 transition-all hover:border-primary/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm"
                >
                  <input type="radio" name="defaultExecutionMode" value={opt.value} defaultChecked={opt.value === (squad?.defaultExecutionMode ?? 'manual')} className="sr-only" />
                  <span className="text-xl leading-none">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Members */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Membros do squad
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Selecione os agents e defina quem será o líder.</p>
        </div>
        <div className="p-5">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
            {/* Agent picker */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/20">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar por nome, slug ou role..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {selectedMemberIds.length}
                </span>
              </div>
              <div className="max-h-[400px] overflow-auto">
                {filteredAgents.length > 0 ? (
                  filteredAgents.map((agent) => {
                    const checked = selectedMemberIds.includes(agent.agentId);
                    const isLeader = leaderAgentId === agent.agentId;
                    return (
                      <label
                        key={agent.agentId}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        <input type="checkbox" name="memberAgentIds" value={agent.agentId} checked={checked} onChange={() => toggleMember(agent.agentId)} className="sr-only" />
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isLeader ? 'bg-amber-500/10' : 'bg-violet-500/10'}`}>
                          {isLeader ? <Crown className="h-3.5 w-3.5 text-amber-500" /> : <Bot className="h-3.5 w-3.5 text-violet-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{agent.agentName ?? `Agent #${agent.agentId}`}</span>
                            {!agent.status && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">inativo</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{agent.role?.trim() || agent.agentSlug?.trim() || `ID ${agent.agentId}`}</p>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {memberSearch ? 'Nenhum agent encontrado.' : 'Nenhum agent disponível.'}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-muted-foreground" />
                  Resumo
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Membros</span>
                    <span className="font-semibold text-foreground">{selectedMembers.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Leader</span>
                    <span className="font-medium text-foreground text-right max-w-[140px] truncate">
                      {selectedMembers.find((a) => a.agentId === leaderAgentId)?.agentName ?? 'Não definido'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Workspace</span>
                    <span className="font-medium text-foreground text-right max-w-[140px] truncate">
                      {workspaces.find((ws) => ws.workspaceId === workspaceId)?.workspaceName ?? 'Livre'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Selecionados
                </p>
                <div className="mt-3 space-y-2">
                  {selectedMembers.length > 0 ? selectedMembers.map((agent) => {
                    const isLeader = leaderAgentId === agent.agentId;
                    return (
                      <div key={agent.agentId} className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${isLeader ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'}`}>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate text-xs">{agent.agentName ?? `Agent #${agent.agentId}`}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{agent.role?.trim() || agent.agentSlug?.trim() || 'Sem papel'}</p>
                        </div>
                        {isLeader && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">Selecione agents na lista ao lado.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {canSubmit
            ? `Pronto · ${selectedMemberIds.length} membro${selectedMemberIds.length > 1 ? 's' : ''}`
            : 'Selecione membros e leader para salvar.'}
        </p>
        <div className="flex gap-2">
          <Link href={cancelHref}>
            <Button type="button" variant="outline" size="sm">Cancelar</Button>
          </Link>
          <Button type="submit" size="sm" className="gap-2" disabled={!canSubmit}>
            <Save className="h-4 w-4" />
            {mode === 'create' ? 'Criar squad' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </form>
  );
}
