import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Layers, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged, fetchWorkspaceById } from '@/lib/auth/api';

export default async function AdminWorkspaceDetailPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const id = Number(workspaceId);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession();
  const [workspace, companies] = await Promise.all([
    fetchWorkspaceById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);
  if (!workspace) notFound();
  const companyName = (companies?.result ?? []).find((item) => item.id === workspace.companyId)?.name ?? `Company #${workspace.companyId}`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/admin/workspaces" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Workspaces</Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{workspace.name ?? `Workspace #${workspace.id}`}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Detalhe do workspace carregado diretamente do backend.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={workspace.status !== false ? 'default' : 'secondary'}>{workspace.status !== false ? 'Ativo' : 'Inativo'}</Badge>
          <Badge variant="outline">ID #{workspace.id}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/10 text-amber-500"><Layers className="h-12 w-12" /></div>
            <p className="text-xl font-semibold">{workspace.name ?? '--'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dados do workspace</CardTitle>
            <CardDescription>Informações persistidas na base atual.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" />{companyName}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p><p className="mt-1 font-medium">{workspace.status !== false ? 'Ativo' : 'Inativo'}</p></div>
            <div className="rounded-xl border border-border p-4 md:col-span-2"><p className="text-xs uppercase tracking-wide text-muted-foreground">Descrição</p><p className="mt-1 inline-flex items-start gap-2 font-medium"><FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />{workspace.description ?? 'Sem descrição cadastrada.'}</p></div>
          </CardContent>
        </Card>
      </div>
      <Link href={`/admin/companies/${workspace.companyId}`}><Button variant="outline">Abrir company vinculada</Button></Link>
    </div>
  );
}
