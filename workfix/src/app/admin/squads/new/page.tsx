
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSquadAction } from '../../_actions';
import { FormSection, Field, SelectField, TextareaField } from '../../_lib/forms';
import { requireAdminSession } from '../../_lib/admin';
import { fetchAgentsByCompany, fetchCompaniesPaged } from '@/lib/auth/api';

export default async function AdminSquadNewPage() {
  const session = await requireAdminSession();
  const companies = (await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null))?.result ?? [];
  const firstCompanyId = companies[0]?.id;
  const firstCompanyAgents = firstCompanyId ? await fetchAgentsByCompany(firstCompanyId, session.token!).catch(() => []) : [];
  return <div className="space-y-6"><div className="space-y-3"><Link href="/admin/squads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Squads</Link><div><h1 className="text-2xl font-semibold text-foreground">Novo squad</h1><p className="mt-1 text-sm text-muted-foreground">Cadastro básico de squad usando o DTO real do back.</p></div></div>
  <form action={saveSquadAction} className="space-y-6 max-w-4xl"><FormSection title="Dados principais"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Company" name="companyId" options={companies.map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /><Field label="Nome" name="name" required /><Field label="Slug" name="slug" /><SelectField label="Leader agent" name="leaderAgentId" options={firstCompanyAgents.map((a) => ({ value: a.id, label: a.name ?? `Agent #${a.id}` }))} /><SelectField label="Status" name="status" defaultValue="true" options={[{value:'true',label:'Ativo'},{value:'false',label:'Inativo'}]} /></div><TextareaField label="Descrição" name="description" /></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar squad</Button><Link href="/admin/squads"><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
