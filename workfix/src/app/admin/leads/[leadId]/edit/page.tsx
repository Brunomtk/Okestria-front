
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveLeadAction } from '../../../_actions';
import { FormSection, Field, SelectField } from '../../../_lib/forms';
import { requireAdminSession } from '../../../_lib/admin';
import { fetchCompaniesPaged, fetchLeadById } from '@/lib/auth/api';

export default async function AdminLeadEditPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params; const id = Number(leadId); if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession(); const [lead, companies] = await Promise.all([fetchLeadById(id, session.token!).catch(() => null), fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null)]); if (!lead) notFound();
  return <div className="space-y-6"><div className="space-y-3"><Link href={`/admin/leads/${lead.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para detalhe</Link><div><h1 className="text-2xl font-semibold text-foreground">Editar lead</h1></div></div><form action={saveLeadAction} className="space-y-6 max-w-4xl"><input type="hidden" name="leadId" value={lead.id} /><FormSection title="Dados principais"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Company" name="companyId" defaultValue={lead.companyId ?? ''} options={(companies?.result ?? []).map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /><Field label="Business name" name="businessName" required defaultValue={lead.businessName ?? ''} /><Field label="Contact name" name="contactName" defaultValue={lead.contactName ?? ''} /><Field label="Email" name="email" type="email" defaultValue={lead.email ?? ''} /><Field label="Phone" name="phone" defaultValue={lead.phone ?? ''} /><Field label="City" name="city" defaultValue={lead.city ?? ''} /><Field label="State" name="state" defaultValue={lead.state ?? ''} /><SelectField label="Status" name="status" defaultValue={lead.status ?? 'new'} options={[{value:'new',label:'Novo'},{value:'contacted',label:'Contatado'},{value:'qualified',label:'Qualificado'},{value:'lost',label:'Perdido'}]} /></div></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar alterações</Button><Link href={`/admin/leads/${lead.id}`}><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
