import {
  Building2,
  Users,
  Bot,
  Target,
  TrendingUp,
  Activity,
  ArrowUpRight,
  LayoutGrid,
  UsersRound,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import Link from 'next/link';
import { requireAdminSession, getAdminDashboardData } from './_lib/admin';

function formatRuntimeLabel(baseUrl: string | null) {
  if (!baseUrl) return 'Nao configurado';
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const data = await getAdminDashboardData(session.token!);

  const cards = [
    {
      title: 'Companies',
      value: data.companies.length,
      subtitle: 'Base cadastrada',
      icon: Building2,
      href: '/admin/companies',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Usuarios',
      value: data.users.length,
      subtitle: 'Usuarios listados',
      icon: Users,
      href: '/admin/users',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Agents',
      value: data.agents.length,
      subtitle: 'Agents consolidados',
      icon: Bot,
      href: '/admin/agents',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      title: 'Leads',
      value: data.leads.length,
      subtitle: 'Leads carregados',
      icon: Target,
      href: '/admin/leads',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  const operations = [
    { label: 'Workspaces', value: data.workspaces.length, icon: LayoutGrid, href: '/admin/workspaces' },
    { label: 'Squads', value: data.squads.length, icon: UsersRound, href: '/admin/squads' },
    {
      label: 'Gateway runtime',
      value: data.runtimeConfigured ? 'OK' : 'Pendente',
      icon: Link2,
      href: '/admin/settings',
    },
  ];

  const activeCompanies = data.companies.filter((company) => company.status !== false).length;
  const adminUsers = data.users.filter((user) => user.type === 1).length;
  const activeAgents = data.agents.filter((agent) => agent.status !== false).length;
  const hotCompanies = data.companies.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visao geral administrativa ligada ao backend real do Okestria.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sessao atual</p>
            <p className="text-sm font-medium text-foreground">{session.fullName ?? 'Admin'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Live
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
              <p className="mt-1 text-sm text-foreground">{card.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Resumo operacional</h2>
              <p className="text-xs text-muted-foreground">Consolidado a partir dos endpoints existentes no back</p>
            </div>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {operations.map((item) => (
              <Link key={item.label} href={item.href} className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-primary/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-semibold text-foreground">{item.value}</p>
                  </div>
                </div>
              </Link>
            ))}
            <div className="rounded-xl border border-border bg-background/50 p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Gateway configurado</p>
                  <p className="text-lg font-semibold text-foreground">{formatRuntimeLabel(data.runtimeBaseUrl)}</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${data.runtimeConfigured ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {data.runtimeConfigured ? 'Configurado' : 'Pendente'}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Token upstream {data.runtimeHasToken ? 'presente' : 'nao encontrado'} no backend.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Saude rapida</h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Companies ativas</span>
              <span className="text-sm font-medium text-foreground">{activeCompanies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Usuarios admin</span>
              <span className="text-sm font-medium text-foreground">{adminUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Agents ativos</span>
              <span className="text-sm font-medium text-foreground">{activeAgents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Leads listados</span>
              <span className="text-sm font-medium text-foreground">{data.leads.length}</span>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Base consolidada em tempo real pelos endpoints atuais.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Companies em destaque</h2>
            <p className="text-xs text-muted-foreground">Primeiras companies retornadas pelo back</p>
          </div>
          <Link href="/admin/companies" className="text-xs font-medium text-primary hover:underline">
            Ver companies
          </Link>
        </div>
        <div className="divide-y divide-border">
          {hotCompanies.length > 0 ? (
            hotCompanies.map((company) => (
              <div key={company.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{company.name ?? `Company #${company.id}`}</p>
                    <p className="text-xs text-muted-foreground">{company.email ?? 'Sem email cadastrado'}</p>
                  </div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium ${company.status !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-secondary-foreground'}`}>
                  {company.status !== false ? 'Ativa' : 'Inativa'}
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhuma company encontrada no backend.</div>
          )}
        </div>
      </div>
    </div>
  );
}
