import {
  Bot,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Power,
  Zap,
  FileCode,
  Building2,
  Star,
} from "lucide-react";
import Link from "next/link";
import { fetchAgentsByCompany, fetchCompaniesPaged, type OkestriaAgent } from "@/lib/auth/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { deleteAgentAction } from "../_actions";
import { buildPageHref, getPageNumber, getSearchTerm, paginate, requireAdminSession, type AdminSearchParams } from "../_lib/admin";

type PageProps = { searchParams?: Promise<AdminSearchParams> };

type AgentRow = OkestriaAgent & { companyName: string };

function filterAgents(items: AgentRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.slug, item.role, item.companyName].some((value) => (value ?? "").toLowerCase().includes(query)),
  );
}

export default async function AdminAgentsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const companiesResponse = await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 100 }).catch(() => null);
  const companies = companiesResponse?.result ?? [];
  const agentGroups = await Promise.all(
    companies.map(async (company) => ({
      company,
      agents: await fetchAgentsByCompany(company.id, session.token!).catch(() => []),
    })),
  );

  const allAgents: AgentRow[] = agentGroups.flatMap(({ company, agents }) =>
    agents.map((agent) => ({ ...agent, companyName: company.name ?? `Company #${company.id}` })),
  );
  const filtered = filterAgents(allAgents, query);
  const pagination = paginate(filtered, page, 9);

  const activeAgents = filtered.filter((agent) => agent.status !== false);
  const defaultAgents = filtered.filter((agent) => agent.isDefault === true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agents carregados do backend por company, consolidados em uma visao unica do admin.
          </p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" />
          Novo Agent
        </Button>
      <div className="flex flex-wrap gap-2"><Link href="/admin/agents/new"><Button className="gap-2">Novo agent</Button></Link></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10"><Bot className="h-5 w-5 text-violet-500" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">Agents filtrados</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><Zap className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold text-foreground">{activeAgents.length}</p><p className="text-xs text-muted-foreground">Ativos</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Star className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-semibold text-foreground">{defaultAgents.length}</p><p className="text-xs text-muted-foreground">Defaults</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><FileCode className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold text-foreground">{new Set(filtered.map((agent) => agent.companyId)).size}</p><p className="text-xs text-muted-foreground">Companies com agents</p></div></div></div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="Buscar por nome, slug, role ou company..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline" size="sm">Aplicar busca</Button>
          <Link href="/admin/agents"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pagination.items.length > 0 ? (
          pagination.items.map((agent) => (
            <div
              key={`${agent.companyId}-${agent.id}`}
              className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-xl">
                    <Bot className="h-6 w-6 text-violet-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/agents/${agent.id}`} className="font-semibold text-foreground hover:text-primary">{agent.name ?? `Agent #${agent.id}`}</Link>
                      {agent.isDefault === true && <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">@{agent.slug ?? `agent-${agent.id}`}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href={`/admin/agents/${agent.id}`}><DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" />Abrir detalhe</DropdownMenuItem></Link>
                    <DropdownMenuItem className="gap-2"><Edit className="h-4 w-4" />Editar</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2"><Power className="h-4 w-4" />{agent.status !== false ? "Desativar" : "Ativar"}</DropdownMenuItem>
                    <form action={deleteAgentAction}><input type="hidden" name="agentId" value={agent.id} /><button type="submit" className="w-full text-left"><DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Excluir</DropdownMenuItem></button></form>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{agent.role ?? agent.description ?? "Sem descricao cadastrada."}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant={agent.status !== false ? "default" : "secondary"}>{agent.status !== false ? "Ativo" : "Inativo"}</Badge>
                <Badge variant="outline">{agent.companyName}</Badge>
              </div>

              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{agent.companyName}</div>
                <div className="flex items-center gap-1.5"><FileCode className="h-3.5 w-3.5" />ID #{agent.id}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum agent encontrado com os filtros atuais.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Pagina {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros encontrados</p>
        <div className="flex items-center gap-2">
          <Link href={buildPageHref('/admin/agents', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link>
          <Link href={buildPageHref('/admin/agents', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Proxima</Button></Link>
        </div>
      </div>
    </div>
  );
}
