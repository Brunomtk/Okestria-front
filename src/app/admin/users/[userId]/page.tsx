import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Mail, Shield, Trash2, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteUserAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged, fetchUserById } from '@/lib/auth/api';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession();
  const [user, companies] = await Promise.all([
    fetchUserById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);
  if (!user) notFound();
  const companyName = user.companyId ? (companies?.result ?? []).find((item) => item.id === user.companyId)?.name ?? `Company #${user.companyId}` : '--';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Usuários</Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{user.name ?? `Usuário #${user.id}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Detalhe do usuário usando o endpoint real por id.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={user.status === 1 ? 'default' : 'secondary'}>{user.status === 1 ? 'Ativo' : 'Inativo'}</Badge>
            <Badge variant="outline">ID #{user.id}</Badge>
            <Badge variant="outline">{user.type === 1 ? 'Admin' : user.type === 2 ? 'Company' : 'Usuário'}</Badge>
          </div>
        </div>
        <div className="flex gap-2"><Link href={`/admin/users/${user.id}/edit`}><Button variant="outline">Editar</Button></Link><form action={deleteUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <Button type="submit" variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
        </form></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary"><UserCircle2 className="h-12 w-12" /></div>
            <div>
              <p className="text-xl font-semibold">{user.name ?? '--'}</p>
              <p className="text-sm text-muted-foreground">{user.email ?? 'Sem email'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
            <CardDescription>Leitura administrativa do cadastro atual.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-muted-foreground" />{user.email ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Perfil</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Shield className="h-4 w-4 text-muted-foreground" />{user.type === 1 ? 'Admin' : user.type === 2 ? 'Company' : 'Usuário'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Company vinculada</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" />{companyName}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p><p className="mt-1 font-medium">{user.status === 1 ? 'Ativo' : 'Inativo'}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
