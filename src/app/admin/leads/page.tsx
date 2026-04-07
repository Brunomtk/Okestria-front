import { Building2, CheckCircle2, Clock, Mail, MoreHorizontal, Phone, Search, Sparkles, Target, XCircle } from 'lucide-react';
import Link from 'next/link';
import { fetchCompaniesPaged, fetchLeadsPaged } from '@/lib/auth/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { generateLeadInsightsAction } from '../_actions';
import { buildPageHref, filterLeads, getPageNumber, getSearchTerm, paginate, requireAdminSession, type AdminSearchParams } from '../_lib/admin';

type PageProps = { searchParams?: Promise<AdminSearchParams> };

function getLeadStatus(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  switch (normalized) {
    case 'new': return { label: 'Novo', variant: 'default' as const };
    case 'contacted': return { label: 'Contatado', variant: 'secondary' as const };
    case 'qualified': return { label: 'Qualificado', variant: 'default' as const };
    case 'lost': return { label: 'Perdido', variant: 'destructive' as const };
    default: return { label: status ?? 'Sem status', variant: 'outline' as const };
  }
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireAdminSession();
  const page = getPageNumber(params);
  const query = getSearchTerm(params);

  const [leadsResponse, companiesResponse] = await Promise.all([
    fetchLeadsPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);

  const companyMap = new Map((companiesResponse?.result ?? []).map((company) => [company.id, company.name ?? `Company #${company.id}`]));
  const filtered = filterLeads(leadsResponse?.result ?? [], query);
  const pagination = paginate(filtered, page, 12);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-2xl font-semibold text-foreground">Leads</h1><p className="mt-1 text-sm text-muted-foreground">Leads reais com tela de detalhe e ação para gerar insights em background pelo back atual.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/leads/new"><Button className="gap-2">Novo lead</Button></Link></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Target className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.length}</p><p className="text-xs text-muted-foreground">Total</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.filter((l) => (l.status ?? '').toLowerCase() === 'new').length}</p><p className="text-xs text-muted-foreground">Novos</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.filter((l) => (l.status ?? '').toLowerCase() === 'qualified').length}</p><p className="text-xs text-muted-foreground">Qualificados</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-semibold text-foreground">{filtered.filter((l) => (l.status ?? '').toLowerCase() === 'lost').length}</p><p className="text-xs text-muted-foreground">Perdidos</p></div></div></div>
      </div>

      <form className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={query} placeholder="Buscar por empresa, contato, email, cidade..." className="pl-9" /></div><div className="flex items-center gap-2"><Button type="submit" variant="outline" size="sm">Aplicar busca</Button><Link href="/admin/leads"><Button type="button" variant="ghost" size="sm">Limpar</Button></Link></div></form>

      <div className="overflow-hidden rounded-xl border border-border bg-card"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead className="w-12">#</TableHead><TableHead>Lead</TableHead><TableHead>Contato</TableHead><TableHead>Company</TableHead><TableHead>Status</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader><TableBody>{pagination.items.length ? pagination.items.map((lead) => { const statusInfo = getLeadStatus(lead.status); const displayName = lead.businessName ?? lead.contactName ?? `Lead #${lead.id}`; return (<TableRow key={lead.id} className="group"><TableCell className="font-mono text-xs text-muted-foreground">{lead.id}</TableCell><TableCell><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 font-semibold text-sm">{displayName.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase()}</div><div><Link href={`/admin/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary">{displayName}</Link><p className="text-xs text-muted-foreground">{lead.city ?? '--'}{lead.state ? `, ${lead.state}` : ''}</p></div></div></TableCell><TableCell><div className="space-y-1"><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{lead.email ?? '--'}</div><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{lead.phone ?? '--'}</div></div></TableCell><TableCell><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{lead.companyId ? companyMap.get(lead.companyId) ?? `Company #${lead.companyId}` : '--'}</div></TableCell><TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell><TableCell><div className="group relative"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><Link href={`/admin/leads/${lead.id}`}><DropdownMenuItem className="gap-2">Abrir detalhe</DropdownMenuItem></Link><Link href={`/admin/leads/${lead.id}/edit`}><DropdownMenuItem className="gap-2">Editar</DropdownMenuItem></Link><form action={generateLeadInsightsAction}><input type="hidden" name="leadId" value={lead.id} /><input type="hidden" name="redirectTo" value="/admin/leads" /><button type="submit" className="w-full text-left"><DropdownMenuItem className="gap-2"><Sparkles className="h-4 w-4" />Gerar insights</DropdownMenuItem></button></form></DropdownMenuContent></DropdownMenu></div></TableCell></TableRow>); }) : <TableRow><TableCell colSpan={6} className="h-32 text-center"><div className="flex flex-col items-center gap-2"><Target className="h-8 w-8 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Nenhum lead encontrado</p></div></TableCell></TableRow>}</TableBody></Table></div>

      <div className="flex items-center justify-between text-sm text-muted-foreground"><p>Pagina {pagination.currentPage} de {pagination.pageCount} · {filtered.length} registros encontrados</p><div className="flex items-center gap-2"><Link href={buildPageHref('/admin/leads', params, Math.max(1, pagination.currentPage - 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage <= 1}>Anterior</Button></Link><Link href={buildPageHref('/admin/leads', params, Math.min(pagination.pageCount, pagination.currentPage + 1))}><Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.pageCount}>Próxima</Button></Link></div></div>
    </div>
  );
}
