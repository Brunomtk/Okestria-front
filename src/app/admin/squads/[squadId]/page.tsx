import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bot, Building2, Crown, Layers, Trash2, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteSquadAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged, fetchSquadById } from '@/lib/auth/api';

function modeLabel(mode?: string | null) {
  switch ((mode ?? '').toLowerCase()) {
    case 'leader':
      return 'Leader';
    case 'all':
      return 'Todos os membros';
    case 'workflow':
      return 'Workflow';
    default:
      return 'Manual';
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
    (companies?.result ?? []).find((item) => item.id === squad.companyId)?.name ??
    `Company #${squad.companyId}`;

  const companyName = squad.companyName?.trim() || fallbackCompanyName;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link href="/admin/squads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Squads</Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{squad.name ?? `Squad #${squad.id}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Visão completa do squad com members, workspace e execução padrão.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={(squad.status ?? squad.isActive ?? true) ? 'default' : 'secondary'}>{(squad.status ?? squad.isActive ?? true) ? 'Ativo' : 'Inativo'}</Badge>
            <Badge variant="outline">{modeLabel(squad.defaultExecutionMode)}</Badge>
            <Badge variant="outline">ID #{squad.id}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/squads/${squad.id}/edit`}><Button variant="outline">Editar</Button></Link>
          <form action={deleteSquadAction}>
            <input type="hidden" name="squadId" value={squad.id} />
            <Button type="submit" variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p><p className="mt-2 text-2xl font-semibold text-foreground">{squad.memberCount ?? squad.members?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p><p className="mt-2 text-2xl font-semibold text-foreground">{squad.activeMemberCount ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</p><p className="mt-2 text-2xl font-semibold text-foreground">{squad.taskCount ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p><p className="mt-2 text-base font-semibold text-foreground">{squad.workspaceName?.trim() || 'Livre'}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>O essencial do squad em uma leitura rápida.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" />{companyName}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Leader</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Crown className="h-4 w-4 text-muted-foreground" />{squad.leaderAgentName?.trim() || 'Não definido'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Layers className="h-4 w-4 text-muted-foreground" />{squad.workspaceName?.trim() || 'Sem vínculo'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Execução padrão</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Workflow className="h-4 w-4 text-muted-foreground" />{modeLabel(squad.defaultExecutionMode)}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</p><p className="mt-1 font-medium">{squad.description?.trim() || 'Sem descrição cadastrada.'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
            <CardDescription>Lista pronta para conferência rápida.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {squad.members?.length ? squad.members.map((member) => (
                <div key={`${member.id ?? member.agentId}-${member.agentId}`} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{member.agentName?.trim() || `Agent #${member.agentId}`}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{member.role?.trim() || member.agentSlug?.trim() || 'Sem papel definido'}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {member.isLeader ? <Badge>Leader</Badge> : null}
                    <Badge variant={member.canReceiveTasks ? 'outline' : 'secondary'}>{member.canReceiveTasks ? 'Recebe task' : 'Sem task'}</Badge>
                    <Badge variant={member.agentStatus ? 'outline' : 'secondary'}>{member.agentStatus ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                </div>
              )) : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum membro cadastrado neste squad.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
