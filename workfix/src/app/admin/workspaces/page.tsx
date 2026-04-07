import {
  Layers,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Power,
  Building2,
  Users,
  Bot,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { fetchCompaniesPaged, fetchWorkspacesByCompany, fetchUsersByCompany, fetchAgentsByCompany, type OkestriaWorkspace } from "@/lib/auth/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { buildPageHref, getPageNumber, getSearchTerm, paginate, requireAdminSession, type AdminSearchParams } from "../_lib/admin";

type PageProps = { searchParams?: Promise<AdminSearchParams> };
type WorkspaceRow = OkestriaWorkspace & { companyName: string; usersCount: number; agentsCount: number };

function filterWorkspaces(items: WorkspaceRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.description, item.companyName].some((value) => (value ?? "").toLowerCase().includes(query)),
  );
}

export default async function AdminWorkspacesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResponse = await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 100 }).catch(() => null);
  const companies = companiesResponse?.result ?? [];

  const groups = await Promise.all(
    companies.map(async (company) => {
      const [workspaces, users, agents] = await Promise.all([
        fetchWorkspacesByCompany(company.id, session.token!).catch(() => []),
        fetchUsersByCompany(company.id, session.token!).catch(() => []),
        fetchAgentsByCompany(company.id, session.token!).catch(() => []),
      ]);
      return { company, workspaces, usersCount: users.length, agentsCount: agents.length };
    }),
  );

  const allWorkspaces: WorkspaceRow[] = groups.flatMap(({ company, workspaces, usersCount, agentsCount }) =>
    workspaces.map((workspace) => ({
      ...workspace,
      companyName: company.name ?? `Company #${company.id}`,
      usersCount,
      agentsCount,
    })),
  );

  const filtered = filterWorkspaces(allWorkspaces, query);
  const pagination = paginate(filtered, page, 9);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workspaces agregados por company a partir dos endpoints reais disponiveis no backend.</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" />
          Novo Workspace
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Layers className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">Total</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><FolderOpen className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.filter((w) => w.status !== false).length}</p><p className="text-xs text-muted-foreground">Ativos</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Building2 className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-semibold text-foreground">{new Set(filtered.map((workspace) => workspace.companyId)).size}</p><p className="text-xs text-muted-foreground">Companies vinculadas</p></div></div></div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Buscar workspace ou company..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline" size="sm">Aplicar busca</Button>
          <Link href="/admin/workspaces"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pagination.items.map((workspace) => (
          <div
            key={`${workspace.companyId}-${workspace.id}`}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Link href={`/admin/workspaces/${workspace.id}`} className="font-semibold text-foreground hover:text-primary">{workspace.name ?? `Workspace #${workspace.id}`}</Link>
                  <p className="text-xs text-muted-foreground">ID #{workspace.id}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/admin/workspaces/${workspace.id}`}><DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" />Abrir detalhe</DropdownMenuItem></Link>
                  <DropdownMenuItem className="gap-2"><Edit className="h-4 w-4" />Editar</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2"><Power className="h-4 w-4" />{workspace.status !== false ? "Desativar" : "Ativar"}</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{workspace.description ?? "Sem descricao cadastrada."}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {workspace.companyName}
              </div>
              <Badge variant={workspace.status !== false ? "default" : "secondary"}>
                {workspace.status !== false ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />{workspace.usersCount} usuarios
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />{workspace.agentsCount} agents
              </div>
            </div>
          </div>
        ))}
        {!pagination.items.length && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum workspace encontrado com os filtros atuais.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Pagina {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros encontrados</p>
        <div className="flex items-center gap-2">
          <Link href={buildPageHref('/admin/workspaces', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link>
          <Link href={buildPageHref('/admin/workspaces', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Proxima</Button></Link>
        </div>
      </div>
    </div>
  );
}
