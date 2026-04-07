import { Building2, Mail, MoreHorizontal, Search, Shield, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import Link from 'next/link';
import { fetchCompaniesPaged, fetchUsersPaged } from '@/lib/auth/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { deleteUserAction } from '../_actions';
import { buildPageHref, filterUsers, getPageNumber, getSearchTerm, paginate, requireAdminSession, type AdminSearchParams } from '../_lib/admin';

type PageProps = { searchParams?: Promise<AdminSearchParams> };

function getUserType(type?: number) {
  switch (type) {
    case 1: return { label: 'Admin', color: 'bg-violet-500/10 text-violet-500' };
    case 2: return { label: 'Company', color: 'bg-primary/10 text-primary' };
    default: return { label: 'Usuário', color: 'bg-muted text-muted-foreground' };
  }
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const [usersResponse, companiesResponse] = await Promise.all([
    fetchUsersPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);

  const companyMap = new Map((companiesResponse?.result ?? []).map((company) => [company.id, company.name ?? `Company #${company.id}`]));
  const filtered = filterUsers(usersResponse?.result ?? [], query);
  const pagination = paginate(filtered, page, 12);
  const activeUsers = filtered.filter((u) => u.status === 1);
  const adminUsers = filtered.filter((u) => u.type === 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">Listagem real dos usuários com detalhe individual e ação de exclusão já ligada ao back.</p>
        </div>
      <div className="flex flex-wrap gap-2"><Link href="/admin/users/new"><Button className="gap-2">Novo usuário</Button></Link></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">Usuários filtrados</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><UserCheck className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold text-foreground">{activeUsers.length}</p><p className="text-xs text-muted-foreground">Ativos</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10"><UserX className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length - activeUsers.length}</p><p className="text-xs text-muted-foreground">Inativos</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10"><Shield className="h-5 w-5 text-violet-500" /></div><div><p className="text-2xl font-semibold text-foreground">{adminUsers.length}</p><p className="text-xs text-muted-foreground">Admins</p></div></div></div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={query} placeholder="Buscar por nome, email ou company..." className="pl-9" /></div>
        <div className="flex items-center gap-2"><Button type="submit" variant="outline" size="sm">Aplicar busca</Button><Link href="/admin/users"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link></div>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50"><TableHead className="w-12">#</TableHead><TableHead>Usuário</TableHead><TableHead>Tipo</TableHead><TableHead>Company</TableHead><TableHead>Status</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
          <TableBody>
            {pagination.items.length ? pagination.items.map((user) => {
              const userType = getUserType(user.type);
              return (
                <TableRow key={user.id} className="group">
                  <TableCell className="font-mono text-xs text-muted-foreground">{user.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{(user.name ?? 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div><Link href={`/admin/users/${user.id}`} className="font-medium text-foreground hover:text-primary">{user.name ?? 'Sem nome'}</Link><div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{user.email ?? 'Sem email'}</div></div>
                    </div>
                  </TableCell>
                  <TableCell><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${userType.color}`}>{user.type === 1 ? <Shield className="h-3 w-3" /> : null}{userType.label}</span></TableCell>
                  <TableCell>{user.companyId ? <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{companyMap.get(user.companyId) ?? `Company #${user.companyId}`}</div> : <span className="text-xs text-muted-foreground/70">--</span>}</TableCell>
                  <TableCell><Badge variant={user.status === 1 ? 'default' : 'secondary'}>{user.status === 1 ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="group relative"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><Link href={`/admin/users/${user.id}`}><DropdownMenuItem className="gap-2">Abrir detalhe</DropdownMenuItem></Link><Link href={`/admin/users/${user.id}/edit`}><DropdownMenuItem className="gap-2">Editar</DropdownMenuItem></Link><form action={deleteUserAction}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="redirectTo" value="/admin/users" /><button type="submit" className="w-full text-left"><DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></button></form></DropdownMenuContent></DropdownMenu></div>
                  </TableCell>
                </TableRow>
              );
            }) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground"><p>Pagina {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros encontrados</p><div className="flex items-center gap-2"><Link href={buildPageHref('/admin/users', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link><Link href={buildPageHref('/admin/users', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Próxima</Button></Link></div></div>
    </div>
  );
}
