
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveUserAction } from '../../_actions';
import { FormSection, Field, SelectField } from '../../_lib/forms';
import { requireAdminSession } from '../../_lib/admin';
import { fetchCompaniesPaged } from '@/lib/auth/api';

export default async function AdminUserNewPage() {
  const session = await requireAdminSession();
  const companies = (await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null))?.result ?? [];
  return <div className="space-y-6">
    <div className="space-y-3"><Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Users</Link><div><h1 className="text-2xl font-semibold text-foreground">Novo usuário</h1><p className="mt-1 text-sm text-muted-foreground">Cadastro real usando o endpoint atual de usuários.</p></div></div>
    <form action={saveUserAction} className="space-y-6 max-w-4xl">
      <FormSection title="Dados de acesso"><div className="grid gap-4 md:grid-cols-2"><Field label="Nome" name="name" required /><Field label="E-mail" name="email" type="email" required /><Field label="Senha" name="password" type="password" required /><SelectField label="Company" name="companyId" options={companies.map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /></div></FormSection>
      <FormSection title="Configuração"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Tipo" name="type" defaultValue="2" options={[{value:1,label:'Admin'},{value:2,label:'Company'}]} /><SelectField label="Status" name="status" defaultValue="1" options={[{value:1,label:'Ativo'},{value:0,label:'Inativo'}]} /><Field label="Idioma" name="language" defaultValue="pt-BR" /><Field label="Tema" name="theme" defaultValue="dark" /></div></FormSection>
      <div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar usuário</Button><Link href="/admin/users"><Button type="button" variant="outline">Cancelar</Button></Link></div>
    </form>
  </div>
}
