'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormSection } from '../../_lib/forms';
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
  { value: 'manual', label: 'Manual' },
  { value: 'leader', label: 'Leader' },
  { value: 'all', label: 'Todos os membros' },
  { value: 'workflow', label: 'Workflow' },
] as const;

export default function AdminSquadForm({ mode, companies, catalogs, squad, action, cancelHref }: AdminSquadFormProps) {
  const initialCompanyId = squad?.companyId ?? companies[0]?.id ?? 0;
  const [companyId, setCompanyId] = useState<number>(initialCompanyId);
  const [leaderAgentId, setLeaderAgentId] = useState<number>(squad?.leaderAgentId ?? 0);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(
    squad?.members
      ?.map((member) => member.agentId)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) ?? [],
  );

  const catalog = catalogs[companyId] ?? { companyId, agents: [], workspaces: [] };
  const agents = useMemo(
    () => [...(catalog.agents ?? [])].sort((a, b) => Number(b.status) - Number(a.status) || (a.agentName ?? '').localeCompare(b.agentName ?? '')),
    [catalog.agents],
  );
  const workspaces = useMemo(
    () => [...(catalog.workspaces ?? [])].sort((a, b) => Number(b.status) - Number(a.status) || (a.workspaceName ?? '').localeCompare(b.workspaceName ?? '')),
    [catalog.workspaces],
  );

  const selectedMembers = useMemo(
    () => agents.filter((agent) => selectedMemberIds.includes(agent.agentId)),
    [agents, selectedMemberIds],
  );

  const toggleMember = (agentId: number) => {
    setSelectedMemberIds((current) => {
      if (current.includes(agentId)) {
        return current.filter((value) => value !== agentId);
      }
      return [...current, agentId];
    });
  };

  const handleCompanyChange = (value: string) => {
    const nextCompanyId = Number(value);
    if (!Number.isFinite(nextCompanyId) || nextCompanyId <= 0) return;
    setCompanyId(nextCompanyId);
    const nextCatalog = catalogs[nextCompanyId] ?? { agents: [], workspaces: [] };
    const activeAgents = nextCatalog.agents?.filter((agent) => agent.status) ?? [];
    setSelectedMemberIds([]);
    setLeaderAgentId(activeAgents[0]?.agentId ?? 0);
  };

  return (
    <form action={action} className="space-y-6 max-w-5xl">
      {squad?.id ? <input type="hidden" name="squadId" value={squad.id} /> : null}

      <FormSection title="Dados principais" description="Cadastro direto, limpo e alinhado ao backend novo.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">Company</span>
            <select
              name="companyId"
              value={String(companyId || '')}
              onChange={(event) => handleCompanyChange(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name ?? `Company #${company.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">Nome</span>
            <input
              name="name"
              required
              defaultValue={squad?.name ?? ''}
              placeholder="Ex.: Squad Comercial"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">Slug</span>
            <input
              name="slug"
              defaultValue={squad?.slug ?? ''}
              placeholder="squad-comercial"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">Workspace</span>
            <select
              name="workspaceId"
              defaultValue={String(squad?.workspaceId ?? '')}
              key={`workspace-${companyId}-${squad?.workspaceId ?? 'new'}`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Sem vínculo</option>
              {workspaces.map((workspace) => (
                <option key={workspace.workspaceId} value={workspace.workspaceId}>
                  {workspace.workspaceName ?? `Workspace #${workspace.workspaceId}`}
                  {workspace.status ? '' : ' · inativo'}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">Leader</span>
            <select
              name="leaderAgentId"
              value={String(leaderAgentId || '')}
              onChange={(event) => setLeaderAgentId(Number(event.target.value) || 0)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {agents.map((agent) => (
                <option key={agent.agentId} value={agent.agentId}>
                  {agent.agentName ?? `Agent #${agent.agentId}`}
                  {agent.role ? ` · ${agent.role}` : ''}
                  {agent.status ? '' : ' · inativo'}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">Modo padrão</span>
            <select
              name="defaultExecutionMode"
              defaultValue={squad?.defaultExecutionMode ?? 'manual'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {executionModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 block xl:col-span-3">
            <span className="text-sm font-medium text-foreground">Descrição</span>
            <textarea
              name="description"
              defaultValue={squad?.description ?? ''}
              placeholder="Explique de forma curta a responsabilidade do squad."
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">Status</span>
            <select
              name="status"
              defaultValue={(squad?.status ?? squad?.isActive ?? true) ? 'true' : 'false'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
        </div>
      </FormSection>

      <FormSection title="Membros" description="Selecione os agents que realmente fazem parte do squad.">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">Agents disponíveis</div>
            <div className="max-h-[360px] overflow-auto divide-y divide-border">
              {agents.length ? (
                agents.map((agent) => {
                  const checked = selectedMemberIds.includes(agent.agentId);
                  const leader = leaderAgentId === agent.agentId;
                  return (
                    <label key={agent.agentId} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted/40">
                      <input
                        type="checkbox"
                        name="memberAgentIds"
                        value={agent.agentId}
                        checked={checked}
                        onChange={() => toggleMember(agent.agentId)}
                        className="mt-1 h-4 w-4 rounded border-input"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{agent.agentName ?? `Agent #${agent.agentId}`}</span>
                          {leader ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Leader</span> : null}
                          {!agent.status ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Inativo</span> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {agent.role?.trim() || agent.agentSlug?.trim() || `Agent ID ${agent.agentId}`}
                        </p>
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-sm text-muted-foreground">Nenhum agent disponível para esta company.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Resumo</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between"><span>Membros</span><span className="font-medium text-foreground">{selectedMembers.length}</span></div>
                <div className="flex items-center justify-between"><span>Leader</span><span className="font-medium text-foreground">{agents.find((item) => item.agentId === leaderAgentId)?.agentName ?? 'Não definido'}</span></div>
                <div className="flex items-center justify-between"><span>Workspace</span><span className="font-medium text-foreground">{workspaces.find((item) => item.workspaceId === Number(squad?.workspaceId ?? 0))?.workspaceName ?? 'Livre'}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium text-foreground">Membros selecionados</p>
              <div className="mt-3 space-y-2">
                {selectedMembers.length ? (
                  selectedMembers.map((agent) => (
                    <div key={agent.agentId} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="font-medium text-foreground">{agent.agentName ?? `Agent #${agent.agentId}`}</div>
                      <div className="text-xs text-muted-foreground">{agent.role?.trim() || agent.agentSlug?.trim() || 'Sem papel definido'}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Selecione ao menos o leader para deixar o squad pronto.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" className="gap-2">
          <Save className="h-4 w-4" />
          {mode === 'create' ? 'Salvar squad' : 'Salvar alterações'}
        </Button>
        <Link href={cancelHref}>
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
