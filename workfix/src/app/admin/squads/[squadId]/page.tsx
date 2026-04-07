import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Layers, Trash2, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteSquadAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged, fetchSquadById, fetchWorkspacesByCompany } from '@/lib/auth/api';

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
  const workspaces = await fetchWorkspacesByCompany(squad.companyId, session.token!).catch(() => []);
  const companyName = (companies?.result ?? []).find((item) => item.id === squad.companyId)?.name ?? `Company #${squad.companyId}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link href="/admin/squads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Squads</Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{squad.name ?? `Squad #${squad.id}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Detalhe do squad com dados reais e ação de exclusão.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={(squad.status ?? squad.isActive ?? true) ? 'default' : 'secondary'}>{(squad.status ?? squad.isActive ?? true) ? 'Ativo' : 'Inativo'}</Badge>
            <Badge variant="outline">ID #{squad.id}</Badge>
          </div>
        </div>
        <div className="flex gap-2"><Link href={`/admin/squads/${squad.id}/edit`}><Button variant="outline">Editar</Button></Link><form action={deleteSquadAction}>
          <input type="hidden" name="squadId" value={squad.id} />
          <Button type="submit" variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
        </form></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary"><UsersRound className="h-12 w-12" /></div>
            <p className="text-xl font-semibold">{squad.name ?? '--'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dados do squad</CardTitle>
            <CardDescription>Cadastro atual trazido pelo backend.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" />{companyName}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">LeaderAgentId</p><p className="mt-1 font-medium">{squad.leaderAgentId ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4 md:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</p><p className="mt-1 font-medium">{squad.description ?? 'Sem descrição cadastrada.'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">WorkspaceId</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Layers className="h-4 w-4 text-muted-foreground" />{squad.workspaceId ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Workspaces na company</p><p className="mt-1 font-medium">{workspaces.length}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
