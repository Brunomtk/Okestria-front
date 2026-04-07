import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bot, Building2, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteAgentAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import { fetchAgentById, fetchCompaniesPaged } from '@/lib/auth/api';

export default async function AdminAgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const id = Number(agentId);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession();
  const [agent, companies] = await Promise.all([
    fetchAgentById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);
  if (!agent) notFound();
  const companyName = (companies?.result ?? []).find((item) => item.id === agent.companyId)?.name ?? `Company #${agent.companyId}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Agents</Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{agent.name ?? `Agent #${agent.id}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Detalhe do agent com dados reais do backend por id.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={agent.status !== false ? 'default' : 'secondary'}>{agent.status !== false ? 'Ativo' : 'Inativo'}</Badge>
            <Badge variant="outline">ID #{agent.id}</Badge>
            {agent.isDefault ? <Badge variant="outline">Default</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2"><Link href={`/admin/agents/${agent.id}/edit`}><Button variant="outline">Editar</Button></Link><form action={deleteAgentAction}>
          <input type="hidden" name="agentId" value={agent.id} />
          <Button type="submit" variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
        </form></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-500/10 text-violet-500"><Bot className="h-12 w-12" /></div>
            <div>
              <p className="text-xl font-semibold">{agent.name ?? '--'}</p>
              <p className="text-sm text-muted-foreground">@{agent.slug ?? `agent-${agent.id}`}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
            <CardDescription>Cadastro base do agent persistido no back.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p><p className="mt-1 font-medium">{agent.role ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" />{companyName}</p></div>
            <div className="rounded-xl border border-border p-4 md:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</p><p className="mt-1 font-medium">{agent.description ?? 'Sem descrição cadastrada.'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Emoji</p><p className="mt-1 font-medium">{agent.emoji ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Default</p><p className="mt-1 inline-flex items-center gap-2 font-medium">{agent.isDefault ? <Star className="h-4 w-4 text-amber-500" /> : null}{agent.isDefault ? 'Sim' : 'Não'}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
