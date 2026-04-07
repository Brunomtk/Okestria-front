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
  Target,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { fetchCompaniesPaged, fetchSquadsByCompany, fetchAgentsByCompany, fetchWorkspacesByCompany, type OkestriaSquad } from "@/lib/auth/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { deleteSquadAction } from "../_actions";
import { buildPageHref, getPageNumber, getSearchTerm, paginate, requireAdminSession, type AdminSearchParams } from "../_lib/admin";

type PageProps = { searchParams?: Promise<AdminSearchParams> };
type SquadRow = OkestriaSquad & { companyName: string; agentsCount: number; workspacesCount: number };

function filterSquads(items: SquadRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.description, item.companyName].some((value) => (value ?? "").toLowerCase().includes(query)),
  );
}

export default async function AdminSquadsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResponse = await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 100 }).catch(() => null);
  const companies = companiesResponse?.result ?? [];
  const groups = await Promise.all(
    companies.map(async (company) => {
      const [squads, agents, workspaces] = await Promise.all([
        fetchSquadsByCompany(company.id, session.token!).catch(() => []),
        fetchAgentsByCompany(company.id, session.token!).catch(() => []),
        fetchWorkspacesByCompany(company.id, session.token!).catch(() => []),
      ]);
      return { company, squads, agentsCount: agents.length, workspacesCount: workspaces.length };
    }),
  );

  const allSquads: SquadRow[] = groups.flatMap(({ company, squads, agentsCount, workspacesCount }) =>
    squads.map((squad) => ({
      ...squad,
      companyName: company.name ?? `Company #${company.id}`,
      agentsCount,
      workspacesCount,
    })),
  );

  const filtered = filterSquads(allSquads, query);
  const pagination = paginate(filtered, page, 9);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Squads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Squads consolidados por company usando os endpoints reais atuais do backend.</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" />
          Novo Squad
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><UsersRound className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">Total de squads</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><Bot className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.reduce((sum, squad) => sum + squad.agentsCount, 0)}</p><p className="text-xs text-muted-foreground">Agents nas companies listadas</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Target className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-semibold text-foreground">{new Set(filtered.map((squad) => squad.companyId)).size}</p><p className="text-xs text-muted-foreground">Companies com squads</p></div></div></div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Buscar squad ou company..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline" size="sm">Aplicar busca</Button>
          <Link href="/admin/squads"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pagination.items.map((squad) => (
          <div
            key={`${squad.companyId}-${squad.id}`}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/10">
                  <UsersRound className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <Link href={`/admin/squads/${squad.id}`} className="font-semibold text-foreground hover:text-primary">{squad.name ?? `Squad #${squad.id}`}</Link>
                  <p className="text-xs text-muted-foreground">ID #{squad.id}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/admin/squads/${squad.id}`}><DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" />Abrir detalhe</DropdownMenuItem></Link>
                  <DropdownMenuItem className="gap-2"><Edit className="h-4 w-4" />Editar</DropdownMenuItem>
                  <form action={deleteSquadAction}><input type="hidden" name="squadId" value={squad.id} /><button type="submit" className="w-full text-left"><DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></button></form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{squad.description ?? "Squad sem descricao cadastrada."}</p>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex -space-x-2">
                {Array.from({ length: Math.min(Math.max(squad.agentsCount, 1), 3) }).map((_, i) => (
                  <Avatar key={i} className="h-7 w-7 border-2 border-card">
                    <AvatarFallback className="bg-muted text-[10px]">A{i + 1}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{squad.agentsCount} agents na company</span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {squad.companyName}
              </div>
              <Badge variant={(squad.status ?? squad.isActive ?? true) ? "default" : "secondary"}>
                {(squad.status ?? squad.isActive ?? true) ? "Ativo" : "Inativo"}
              </Badge>
            </div>

            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" />{squad.agentsCount} agents</div>
              <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{squad.workspacesCount} workspaces</div>
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
        <p>Pagina {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros encontrados</p>
        <div className="flex items-center gap-2">
          <Link href={buildPageHref('/admin/squads', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link>
          <Link href={buildPageHref('/admin/squads', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Proxima</Button></Link>
        </div>
      </div>
    </div>
  );
}
