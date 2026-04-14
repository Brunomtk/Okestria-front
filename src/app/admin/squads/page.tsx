import {
  UsersRound,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Building2,
  Bot,
  Crown,
  Workflow,
  ListChecks,
  Zap,
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
import DeleteSquadButton from './_components/DeleteSquadButton';

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
    case 'leader': return 'Leader';
    case 'all': return 'Todos';
    case 'workflow': return 'Workflow';
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
  const activeSquads = filtered.filter((s) => s.status ?? s.isActive ?? true);
  const totalMembers = filtered.reduce((sum, s) => sum + (s.memberCount ?? s.members?.length ?? 0), 0);
  const totalTasks = filtered.reduce((sum, s) => sum + (s.taskCount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Squads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie seus squads, membros, leaders e modos de execução.</p>
        </div>
        <Link href="/admin/squads/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo squad
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UsersRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Squads</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Zap className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{activeSquads.length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Bot className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Membros totais</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <ListChecks className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tasks totais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Buscar squad, company, workspace ou leader..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline" size="sm">Buscar</Button>
          {query && <Link href="/admin/squads"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link>}
        </div>
      </form>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pagination.items.map((squad) => {
          const isActive = squad.status ?? squad.isActive ?? true;
          return (
            <div key={squad.id} className="group relative rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg">
              {/* Top accent bar */}
              <div className={`h-1 rounded-t-xl ${isActive ? 'bg-primary/60' : 'bg-muted-foreground/20'}`} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/squads/${squad.id}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors">
                      {squad.name ?? `Squad #${squad.id}`}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{squad.companyName}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/admin/squads/${squad.id}`}>
                        <DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" />Ver detalhe</DropdownMenuItem>
                      </Link>
                      <Link href={`/admin/squads/${squad.id}/edit`}>
                        <DropdownMenuItem className="gap-2"><Edit className="h-4 w-4" />Editar</DropdownMenuItem>
                      </Link>
                      <DeleteSquadButton
                        squadId={squad.id}
                        squadName={squad.name ?? `Squad #${squad.id}`}
                        action={deleteSquadAction}
                        variant="dropdown"
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                  {squad.description?.trim() || 'Sem descrição cadastrada.'}
                </p>

                {/* Badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${modeColor(squad.defaultExecutionMode)}`}>
                    <Workflow className="h-3 w-3" />
                    {modeLabel(squad.defaultExecutionMode)}
                  </span>
                  {squad.workspaceName && (
                    <Badge variant="outline" className="text-[10px]">{squad.workspaceName}</Badge>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{squad.memberCount ?? squad.members?.length ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Membros</p>
                  </div>
                  <div className="text-center border-x border-border/50">
                    <p className="text-lg font-semibold text-foreground">{squad.activeMemberCount ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{squad.taskCount ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Tasks</p>
                  </div>
                </div>

                {/* Leader */}
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <span>Leader:</span>
                  <span className="font-medium text-foreground">{squad.leaderAgentName?.trim() || 'Não definido'}</span>
                </div>
              </div>
            </div>
          );
        })}

        {!pagination.items.length && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <UsersRound className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium text-foreground">Nenhum squad encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? 'Tente ajustar os termos de busca.' : 'Crie o primeiro squad para começar.'}
            </p>
            {!query && (
              <Link href="/admin/squads/new">
                <Button size="sm" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Criar squad
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Página {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros</p>
          <div className="flex items-center gap-2">
            <Link href={buildPageHref('/admin/squads', params, Math.max(1, pagination.currentPage - 1))}>
              <Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button>
            </Link>
            <Link href={buildPageHref('/admin/squads', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}>
              <Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Próxima</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
