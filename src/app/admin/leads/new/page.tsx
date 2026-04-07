
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveLeadAction } from '../../_actions';
import { FormSection, Field, SelectField } from '../../_lib/forms';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged } from '@/lib/auth/api';

export default async function AdminLeadNewPage() {
  const session = await requireAdminSession();
  const companies = (await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null))?.result ?? [];
  return <div className="space-y-6"><div className="space-y-3"><Link href="/admin/leads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Leads</Link><div><h1 className="text-2xl font-semibold text-foreground">Novo lead</h1><p className="mt-1 text-sm text-muted-foreground">Cadastro manual de lead direto pelo admin.</p></div></div>
  <form action={saveLeadAction} className="space-y-6 max-w-4xl"><FormSection title="Dados principais"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Company" name="companyId" options={companies.map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /><Field label="Business name" name="businessName" required /><Field label="Contact name" name="contactName" /><Field label="Email" name="email" type="email" /><Field label="Phone" name="phone" /><Field label="City" name="city" /><Field label="State" name="state" /><SelectField label="Status" name="status" defaultValue="new" options={[{value:'new',label:'Novo'},{value:'contacted',label:'Contatado'},{value:'qualified',label:'Qualificado'},{value:'lost',label:'Perdido'}]} /></div></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar lead</Button><Link href="/admin/leads"><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
