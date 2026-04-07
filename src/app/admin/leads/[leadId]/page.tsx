import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, Mail, Phone, Sparkles, Target, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateLeadInsightsAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged, fetchLeadById } from '@/lib/auth/api';

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const id = Number(leadId);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession();
  const [lead, companies] = await Promise.all([
    fetchLeadById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);
  if (!lead) notFound();
  const companyName = lead.companyId ? (companies?.result ?? []).find((item) => item.id === lead.companyId)?.name ?? `Company #${lead.companyId}` : '--';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link href="/admin/leads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Leads</Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{lead.businessName ?? lead.contactName ?? `Lead #${lead.id}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Detalhe do lead com ação real para regenerar insights pelo backend.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">ID #{lead.id}</Badge>
            <Badge variant={lead.status?.toLowerCase() === 'lost' ? 'destructive' : lead.status?.toLowerCase() === 'new' ? 'default' : 'secondary'}>{lead.status ?? 'Sem status'}</Badge>
            {lead.leadGenerationJobId ? <Badge variant="outline">Job #{lead.leadGenerationJobId}</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2"><Link href={`/admin/leads/${lead.id}/edit`}><Button variant="outline">Editar</Button></Link><form action={generateLeadInsightsAction}>
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="redirectTo" value={`/admin/leads/${lead.id}`} />
          <Button type="submit" className="gap-2"><Sparkles className="h-4 w-4" />Gerar insights</Button>
        </form></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dados do lead</CardTitle>
            <CardDescription>Informações básicas recebidas pelo pipeline atual.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Target className="h-4 w-4 text-muted-foreground" />{lead.businessName ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Contato</p><p className="mt-1 font-medium">{lead.contactName ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-muted-foreground" />{lead.email ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Telefone</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Phone className="h-4 w-4 text-muted-foreground" />{lead.phone ?? '--'}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Localização</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-muted-foreground" />{lead.city ?? '--'}{lead.state ? `, ${lead.state}` : ''}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p><p className="mt-1 inline-flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-muted-foreground" />{companyName}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operação</CardTitle>
            <CardDescription>Atalhos para continuar o fluxo administrativo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/admin/companies/${lead.companyId ?? ''}`}><Button variant="outline" className="w-full justify-start">Abrir company vinculada</Button></Link>
            <Link href={`/admin/leads?q=${encodeURIComponent(lead.businessName ?? lead.contactName ?? '')}`}><Button variant="outline" className="w-full justify-start">Buscar leads parecidos</Button></Link>
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Quando você clica em <strong>Gerar insights</strong>, o front chama o endpoint real <code>/api/Leads/{lead.id}/generate-ptx-insights</code> e atualiza a área administrativa.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
