import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bot, Building2, Layers, Target, Users, Power, Trash2, Mail, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteCompanyAction, toggleCompanyStatusAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import { fetchAgentsByCompany, fetchBillingSubscription, fetchBillingUsage, fetchCompanyById, fetchLeadsPaged, fetchUsersByCompany, fetchWorkspacesByCompany } from '@/lib/auth/api';

function fmtDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const id = Number(companyId);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession();

  const company = await fetchCompanyById(id, session.token!).catch(() => null);
  if (!company) notFound();

  const [users, agents, workspaces, leadsRes, subscription, usage] = await Promise.all([
    fetchUsersByCompany(id, session.token!).catch(() => []),
    fetchAgentsByCompany(id, session.token!).catch(() => []),
    fetchWorkspacesByCompany(id, session.token!).catch(() => []),
    fetchLeadsPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
    fetchBillingSubscription(id, session.token!).catch(() => null),
    fetchBillingUsage(id, session.token!).catch(() => null),
  ]);

  const leads = (leadsRes?.result ?? []).filter((lead) => lead.companyId === id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link href="/admin/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Companies
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{company.name ?? `Company #${company.id}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Detalhe administrativo da company com dados reais agregados do backend atual.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={company.status ? 'default' : 'secondary'}>{company.status ? 'Ativa' : 'Inativa'}</Badge>
            <Badge variant="outline">ID #{company.id}</Badge>
            {company.cnpj ? <Badge variant="outline">CNPJ {company.cnpj}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleCompanyStatusAction}>
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="redirectTo" value={`/admin/companies/${company.id}`} />
            <Button type="submit" variant="outline" className="gap-2"><Power className="h-4 w-4" />{company.status ? 'Desativar' : 'Ativar'}</Button>
          </form>
          <Link href={`/admin/companies/${company.id}/edit`}><Button variant="outline">Editar</Button></Link>
          <form action={deleteCompanyAction}>
            <input type="hidden" name="companyId" value={company.id} />
            <Button type="submit" variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold">{users.length}</p><p className="text-xs text-muted-foreground">Usuários</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/10 p-3"><Bot className="h-5 w-5 text-violet-500" /></div><div><p className="text-2xl font-semibold">{agents.length}</p><p className="text-xs text-muted-foreground">Agents</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-500/10 p-3"><Layers className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-semibold">{workspaces.length}</p><p className="text-xs text-muted-foreground">Workspaces</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/10 p-3"><Target className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold">{leads.length}</p><p className="text-xs text-muted-foreground">Leads</p></div></div></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Resumo geral</CardTitle>
            <CardDescription>Informações principais e consumo atual.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Nome</p>
              <p className="mt-1 font-medium">{company.name ?? '--'}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</p>
              <p className="mt-1 font-medium inline-flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{company.email ?? '--'}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
              <p className="mt-1 font-medium">{subscription?.planName ?? 'Sem plano'}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status da assinatura</p>
              <p className="mt-1 font-medium">{subscription?.status ?? 'unknown'}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads usados</p>
              <p className="mt-1 font-medium">{usage?.leadsUsed ?? 0}{usage?.leadsLimit ? ` / ${usage.leadsLimit}` : ''}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Users usados</p>
              <p className="mt-1 font-medium">{usage?.usersUsed ?? 0}{usage?.usersLimit ? ` / ${usage.usersLimit}` : ''}</p>
            </div>
            <div className="rounded-xl border border-border p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Período atual</p>
              <p className="mt-1 font-medium">{fmtDate(subscription?.currentPeriodStartUtc)} até {fmtDate(subscription?.currentPeriodEndUtc)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-primary" />Acesso rápido</CardTitle>
            <CardDescription>Navegação para os dados relacionados desta company.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/admin/users?q=${encodeURIComponent(String(company.id))}`}><Button variant="outline" className="w-full justify-start">Ver usuários desta company</Button></Link>
            <Link href={`/admin/agents?q=${encodeURIComponent(company.name ?? '')}`}><Button variant="outline" className="w-full justify-start">Ver agents relacionados</Button></Link>
            <Link href={`/admin/workspaces?q=${encodeURIComponent(company.name ?? '')}`}><Button variant="outline" className="w-full justify-start">Ver workspaces relacionados</Button></Link>
            <Link href={`/admin/leads?q=${encodeURIComponent(company.name ?? '')}`}><Button variant="outline" className="w-full justify-start">Ver leads relacionados</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
