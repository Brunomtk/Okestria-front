
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveAgentAction } from '../../_actions';
import { FormSection, Field, SelectField, TextareaField } from '../../_lib/forms';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged } from '@/lib/auth/api';

export default async function AdminAgentNewPage() {
  const session = await requireAdminSession();
  const companies = (await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null))?.result ?? [];
  return <div className="space-y-6"><div className="space-y-3"><Link href="/admin/agents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Agents</Link><div><h1 className="text-2xl font-semibold text-foreground">Novo agent</h1><p className="mt-1 text-sm text-muted-foreground">Cadastro básico do agent usando o DTO real do back.</p></div></div>
  <form action={saveAgentAction} className="space-y-6 max-w-4xl"><FormSection title="Identidade"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Company" name="companyId" options={companies.map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /><Field label="Nome" name="name" required /><Field label="Slug" name="slug" /><Field label="Role" name="role" /><Field label="Emoji" name="emoji" /><Field label="Avatar URL" name="avatarUrl" /></div><TextareaField label="Descrição" name="description" /></FormSection><FormSection title="Comportamento"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Status" name="status" defaultValue="true" options={[{value:'true',label:'Ativo'},{value:'false',label:'Inativo'}]} /><SelectField label="Default" name="isDefault" defaultValue="false" options={[{value:'false',label:'Não'},{value:'true',label:'Sim'}]} /></div></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar agent</Button><Link href="/admin/agents"><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
