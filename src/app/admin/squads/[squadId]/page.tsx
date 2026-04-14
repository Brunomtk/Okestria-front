import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Crown,
  Edit,
  Layers,
  ListChecks,
  Loader2,
  Settings2,
  Users,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteSquadAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged, fetchSquadById, type OkestriaSquadTaskSummary } from '@/lib/auth/api';
import DeleteSquadButton from '../_components/DeleteSquadButton';

function modeLabel(mode?: string | null) {
  switch ((mode ?? '').toLowerCase()) {
    case 'leader': return 'Leader decide';
    case 'all': return 'Todos os membros';
    case 'workflow': return 'Workflow sequencial';
    default: return 'Manual';
  }
}

function modeColor(mode?: string | null) {
  switch ((mode ?? '').toLowerCase()) {
    case 'leader': return 'text-violet-500 bg-violet-500/10';
    case 'all': return 'text-blue-500 bg-blue-500/10';
    case 'workflow': return 'text-amber-500 bg-amber-500/10';
    default: return 'text-muted-foreground bg-muted';
  }
}

function taskStatusIcon(status?: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'completed':
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'running':
    case 'in_progress':
    case 'inprogress':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'failed':
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'queued':
      return <Clock className="h-4 w-4 text-amber-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function taskStatusLabel(status?: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'completed':
    case 'done':
      return 'Concluída';
    case 'running':
    case 'in_progress':
    case 'inprogress':
      return 'Em execução';
    case 'failed':
    case 'error':
      return 'Falhou';
    case 'queued':
      return 'Na fila';
    case 'cancelled':
    case 'canceled':
      return 'Cancelada';
    default:
      return status || 'Pendente';
  }
}

function taskStatusColor(status?: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'completed':
    case 'done':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'running':
    case 'in_progress':
      return 'bg-blue-500/10 text-blue-600';
    case 'failed':
    case 'error':
      return 'bg-destructive/10 text-destructive';
    case 'queued':
      return 'bg-amber-500/10 text-amber-600';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default async function AdminSquadDetailPage({ params }: { params: Promise<{ squadId: string }> }) {
  const { squadId } = await params;
  const id = Number(squadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [squad, companies] = await Promise.all([
    fetchSquadById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);
  if (!squad) notFound();

  const fallbackCompanyName =
    (companies?.result ?? []).find((item) => item.id === squad.companyId)?.name ?? `Company #${squad.companyId}`;
  const companyName = squad.companyName?.trim() || fallbackCompanyName;
  const isActive = squad.status ?? squad.isActive ?? true;
  const recentTasks = squad.recentTasks ?? [];
  const members = squad.members ?? [];
  const leader = members.find((m) => m.isLeader);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link href="/admin/squads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Squads
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{squad.name ?? `Squad #${squad.id}`}</h1>
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                {isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{squad.description?.trim() || 'Sem descrição cadastrada.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${modeColor(squad.defaultExecutionMode)}`}>
              <Workflow className="h-3 w-3" />
              {modeLabel(squad.defaultExecutionMode)}
            </span>
            <Badge variant="outline" className="text-xs">ID #{squad.id}</Badge>
            {squad.slug && <Badge variant="outline" className="text-xs font-mono">@{squad.slug}</Badge>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/admin/squads/${squad.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <DeleteSquadButton
            squadId={squad.id}
            squadName={squad.name ?? `Squad #${squad.id}`}
            action={deleteSquadAction}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{squad.memberCount ?? members.length}</p>
              <p className="text-xs text-muted-foreground">Membros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{squad.activeMemberCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <ListChecks className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{squad.taskCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground truncate">{squad.workspaceName?.trim() || 'Livre'}</p>
              <p className="text-xs text-muted-foreground">Workspace</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Info card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                Configuração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" /> Company
                </span>
                <span className="text-sm font-medium text-foreground">{companyName}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Crown className="h-4 w-4 text-amber-500" /> Leader
                </span>
                <span className="text-sm font-medium text-foreground">
                  {squad.leaderAgentName?.trim() || leader?.agentName?.trim() || 'Não definido'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" /> Workspace
                </span>
                <span className="text-sm font-medium text-foreground">{squad.workspaceName?.trim() || 'Sem vínculo'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Workflow className="h-4 w-4" /> Modo
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${modeColor(squad.defaultExecutionMode)}`}>
                  {modeLabel(squad.defaultExecutionMode)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                Tasks recentes
              </CardTitle>
              <CardDescription>Últimas {Math.min(recentTasks.length, 10)} tasks executadas</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTasks.length > 0 ? (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        {taskStatusIcon(task.status)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{task.title?.trim() || `Task #${task.id}`}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.createdDate)}
                            {task.runCount != null && task.runCount > 0 && (
                              <span className="text-muted-foreground/60">· {task.runCount} run{task.runCount > 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${taskStatusColor(task.status)}`}>
                        {taskStatusLabel(task.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <ListChecks className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">Nenhuma task executada ainda.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Members */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  Membros
                </CardTitle>
                <CardDescription className="mt-1">{members.length} membro{members.length !== 1 ? 's' : ''} no squad</CardDescription>
              </div>
              <Link href={`/admin/squads/${squad.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Edit className="h-3 w-3" />
                  Gerenciar
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => {
                  const isLeader = member.isLeader === true;
                  const isAgentActive = member.agentStatus !== false;
                  return (
                    <div
                      key={`${member.id ?? member.agentId}-${member.agentId}`}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                        isLeader ? 'border-amber-500/30 bg-amber-500/5' : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isLeader ? 'bg-amber-500/10' : 'bg-violet-500/10'
                        }`}>
                          {isLeader ? <Crown className="h-4 w-4 text-amber-500" /> : <Bot className="h-4 w-4 text-violet-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.agentName?.trim() || `Agent #${member.agentId}`}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {member.role?.trim() || member.agentSlug?.trim() || 'Sem papel definido'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLeader && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            Leader
                          </span>
                        )}
                        {member.canReceiveTasks && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                            Tasks
                          </span>
                        )}
                        <span className={`h-2 w-2 rounded-full ${isAgentActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Bot className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
                <Link href={`/admin/squads/${squad.id}/edit`}>
                  <Button size="sm" variant="outline" className="mt-3">Adicionar membros</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
