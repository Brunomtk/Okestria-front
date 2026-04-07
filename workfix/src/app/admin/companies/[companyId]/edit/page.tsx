
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveCompanyAction } from '../../../_actions';
import { FormSection, Field, SelectField } from '../../../_lib/forms';
import { requireAdminSession } from '../../../_lib/admin';
import { fetchCompanyById } from '@/lib/auth/api';

export default async function AdminCompanyEditPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params; const id = Number(companyId); if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession(); const company = await fetchCompanyById(id, session.token!).catch(() => null); if (!company) notFound();
  return <div className="space-y-6"><div className="space-y-3"><Link href={`/admin/companies/${company.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para detalhe</Link><div><h1 className="text-2xl font-semibold text-foreground">Editar company</h1></div></div><form action={saveCompanyAction} className="space-y-6 max-w-3xl"><input type="hidden" name="companyId" value={company.id} /><FormSection title="Dados principais"><div className="grid gap-4 md:grid-cols-2"><Field label="Nome" name="name" required defaultValue={company.name ?? ''} /><Field label="E-mail" name="email" type="email" required defaultValue={company.email ?? ''} /></div><div className="grid gap-4 md:grid-cols-2"><Field label="CNPJ" name="cnpj" defaultValue={company.cnpj ?? ''} /><SelectField label="Status" name="status" defaultValue={company.status ? 'true' : 'false'} options={[{value:'true',label:'Ativa'},{value:'false',label:'Inativa'}]} /></div></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar alterações</Button><Link href={`/admin/companies/${company.id}`}><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
