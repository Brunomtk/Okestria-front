import { Bot, Building2, CheckCircle2, Layers, MoreHorizontal, Power, Search, Trash2, Users, XCircle } from 'lucide-react';
import Link from 'next/link';
import { fetchAgentsByCompany, fetchCompaniesPaged, fetchUsersByCompany, fetchWorkspacesByCompany, type OkestriaCompany } from '@/lib/auth/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toggleCompanyStatusAction, deleteCompanyAction } from '../_actions';
import { buildPageHref, filterCompanies, getPageNumber, getSearchTerm, paginate, requireAdminSession, type AdminSearchParams } from '../_lib/admin';

type PageProps = { searchParams?: Promise<AdminSearchParams> };

export default async function AdminCompaniesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResponse = await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 100 }).catch(() => null);
  const allCompanies: OkestriaCompany[] = companiesResponse?.result ?? [];
  const filtered = filterCompanies(allCompanies, query);
  const pagination = paginate(filtered, page, 10);

  const rows = await Promise.all(
    pagination.items.map(async (company) => {
      const [users, agents, workspaces] = await Promise.all([
        fetchUsersByCompany(company.id, session.token!).catch(() => []),
        fetchAgentsByCompany(company.id, session.token!).catch(() => []),
        fetchWorkspacesByCompany(company.id, session.token!).catch(() => []),
      ]);
      return { company, usersCount: users.length, agentsCount: agents.length, workspacesCount: workspaces.length };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lista real de companies, com navegação para detalhe e ações administrativas que o back atual já suporta.</p>
        </div>
      <div className="flex flex-wrap gap-2"><Link href="/admin/companies/new"><Button className="gap-2">Nova company</Button></Link></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">Companies filtradas</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.filter((item) => item.status !== false).length}</p><p className="text-xs text-muted-foreground">Ativas</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.filter((item) => item.status === false).length}</p><p className="text-xs text-muted-foreground">Inativas</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Layers className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-semibold text-foreground">{rows.reduce((sum, row) => sum + row.workspacesCount, 0)}</p><p className="text-xs text-muted-foreground">Workspaces na página</p></div></div></div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={query} placeholder="Buscar por nome, email ou CNPJ..." className="pl-9" /></div>
        <div className="flex items-center gap-2"><Button type="submit" variant="outline" size="sm">Aplicar busca</Button><Link href="/admin/companies"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link></div>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50"><TableHead className="w-12">#</TableHead><TableHead>Company</TableHead><TableHead>Contato</TableHead><TableHead>Uso</TableHead><TableHead>Status</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length ? rows.map(({ company, usersCount, agentsCount, workspacesCount }) => (
              <TableRow key={company.id} className="group">
                <TableCell className="font-mono text-xs text-muted-foreground">{company.id}</TableCell>
                <TableCell>
                  <div>
                    <Link href={`/admin/companies/${company.id}`} className="font-medium text-foreground hover:text-primary">{company.name ?? `Company #${company.id}`}</Link>
                    <p className="text-xs text-muted-foreground">{company.cnpj ?? 'Sem CNPJ informado'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{company.email ?? 'Sem email'}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{usersCount}</span>
                      <span className="inline-flex items-center gap-1"><Bot className="h-3 w-3" />{agentsCount}</span>
                      <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{workspacesCount}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell><p className="text-sm text-muted-foreground">{usersCount} users · {agentsCount} agents · {workspacesCount} workspaces</p></TableCell>
                <TableCell><Badge variant={company.status ? 'default' : 'secondary'}>{company.status ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                <TableCell>
                  <div className="group relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/companies/${company.id}`}><DropdownMenuItem className="gap-2">Abrir detalhe</DropdownMenuItem></Link><Link href={`/admin/companies/${company.id}/edit`}><DropdownMenuItem className="gap-2">Editar</DropdownMenuItem></Link>
                        <form action={toggleCompanyStatusAction}><input type="hidden" name="companyId" value={company.id} /><input type="hidden" name="redirectTo" value="/admin/companies" /><button type="submit" className="w-full text-left"><DropdownMenuItem className="gap-2"><Power className="h-4 w-4" />{company.status ? 'Desativar' : 'Ativar'}</DropdownMenuItem></button></form>
                        <form action={deleteCompanyAction}><input type="hidden" name="companyId" value={company.id} /><button type="submit" className="w-full text-left"><DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></button></form>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">Nenhuma company encontrada.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Pagina {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros encontrados</p>
        <div className="flex items-center gap-2">
          <Link href={buildPageHref('/admin/companies', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link>
          <Link href={buildPageHref('/admin/companies', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Próxima</Button></Link>
        </div>
      </div>
    </div>
  );
}
