import {
  UsersRound,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Building2,
  Bot,
  Layers,
  Crown,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { fetchCompaniesPaged, fetchSquadsByCompany, type OkestriaSquad } from '@/lib/auth/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { deleteSquadAction } from '../_actions';
import { buildPageHref, getPageNumber, getSearchTerm, paginate, requireAdminSession, type AdminSearchParams } from '../_lib/admin';

type PageProps = { searchParams?: Promise<AdminSearchParams> };
type SquadRow = OkestriaSquad & { companyName: string };

function filterSquads(items: SquadRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.description, item.companyName, item.workspaceName, item.leaderAgentName]
      .some((value) => (value ?? '').toLowerCase().includes(query)),
  );
}

function modeLabel(mode?: string | null) {
  switch ((mode ?? '').toLowerCase()) {
    case 'leader':
      return 'Leader';
    case 'all':
      return 'Todos';
    case 'workflow':
      return 'Workflow';
    default:
      return 'Manual';
  }
}

export default async function AdminSquadsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResponse = await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 100 }).catch(() => null);
  const companies = companiesResponse?.result ?? [];

  const allSquads: SquadRow[] = (
    await Promise.all(
      companies.map(async (company) => {
        const squads = await fetchSquadsByCompany(company.id, session.token!).catch(() => []);
        return squads.map((squad) => ({
          ...squad,
          companyName: squad.companyName?.trim() || company.name?.trim() || `Company #${company.id}`,
        }));
      }),
    )
  ).flat();

  const filtered = filterSquads(allSquads, query);
  const pagination = paginate(filtered, page, 9);
  const totalMembers = filtered.reduce((sum, squad) => sum + (squad.memberCount ?? squad.members?.length ?? 0), 0);
  const totalActiveMembers = filtered.reduce((sum, squad) => sum + (squad.activeMemberCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Squads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastro direto, visão limpa e dados alinhados com workspace, leader e membros.</p>
        </div>
        <Link href="/admin/squads/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo squad
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><UsersRound className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">Squads encontrados</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><Bot className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold text-foreground">{totalMembers}</p><p className="text-xs text-muted-foreground">Membros totais</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Workflow className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-semibold text-foreground">{totalActiveMembers}</p><p className="text-xs text-muted-foreground">Membros ativos</p></div></div></div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Buscar por squad, company, workspace ou leader..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline" size="sm">Aplicar</Button>
          <Link href="/admin/squads"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pagination.items.map((squad) => (
          <div key={squad.id} className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/admin/squads/${squad.id}`} className="text-base font-semibold text-foreground hover:text-primary">{squad.name ?? `Squad #${squad.id}`}</Link>
                <p className="mt-1 text-xs text-muted-foreground">{squad.companyName}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/admin/squads/${squad.id}`}><DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" />Abrir</DropdownMenuItem></Link>
                  <Link href={`/admin/squads/${squad.id}/edit`}><DropdownMenuItem className="gap-2"><Edit className="h-4 w-4" />Editar</DropdownMenuItem></Link>
                  <form action={deleteSquadAction}><input type="hidden" name="squadId" value={squad.id} /><button type="submit" className="w-full text-left"><DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></button></form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{squad.description?.trim() || 'Sem descrição cadastrada.'}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={(squad.status ?? squad.isActive ?? true) ? 'default' : 'secondary'}>{(squad.status ?? squad.isActive ?? true) ? 'Ativo' : 'Inativo'}</Badge>
              <Badge variant="outline">{modeLabel(squad.defaultExecutionMode)}</Badge>
              {squad.workspaceName ? <Badge variant="outline">{squad.workspaceName}</Badge> : null}
            </div>

            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5"><Crown className="h-3.5 w-3.5" />Leader</span><span className="font-medium text-foreground">{squad.leaderAgentName?.trim() || 'Não definido'}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" />Membros</span><span className="font-medium text-foreground">{squad.memberCount ?? squad.members?.length ?? 0}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />Ativos</span><span className="font-medium text-foreground">{squad.activeMemberCount ?? 0}</span></div>
            </div>

            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Company</span><span>{squad.companyName}</span></div>
            </div>
          </div>
        ))}
        {!pagination.items.length && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum squad encontrado com os filtros atuais.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Página {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros</p>
        <div className="flex items-center gap-2">
          <Link href={buildPageHref('/admin/squads', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link>
          <Link href={buildPageHref('/admin/squads', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Próxima</Button></Link>
        </div>
      </div>
    </div>
  );
}
