
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveCompanyAction } from '../../_actions';
import { FormSection, Field, SelectField } from '../../_lib/forms';

export default function AdminCompanyNewPage() {
  return <div className="space-y-6">
    <div className="space-y-3">
      <Link href="/admin/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Companies</Link>
      <div><h1 className="text-2xl font-semibold text-foreground">Nova company</h1><p className="mt-1 text-sm text-muted-foreground">Cadastro simples ligado ao endpoint real de criação de company.</p></div>
    </div>
    <form action={saveCompanyAction} className="space-y-6 max-w-3xl">
      <FormSection title="Dados principais">
        <div className="grid gap-4 md:grid-cols-2"><Field label="Nome" name="name" required /><Field label="E-mail" name="email" type="email" required /></div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="CNPJ" name="cnpj" /><SelectField label="Status" name="status" defaultValue="true" options={[{value:'true',label:'Ativa'},{value:'false',label:'Inativa'}]} /></div>
      </FormSection>
      <div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar company</Button><Link href="/admin/companies"><Button type="button" variant="outline">Cancelar</Button></Link></div>
    </form>
  </div>
}
