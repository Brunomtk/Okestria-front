
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveUserAction } from '../../../_actions';
import { FormSection, Field, SelectField } from '../../../_lib/forms';
import { requireAdminSession } from '../../../_lib/admin';
import { fetchCompaniesPaged, fetchUserById } from '@/lib/auth/api';

export default async function AdminUserEditPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params; const id = Number(userId); if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession(); const [user, companies] = await Promise.all([fetchUserById(id, session.token!).catch(() => null), fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null)]); if (!user) notFound();
  return <div className="space-y-6"><div className="space-y-3"><Link href={`/admin/users/${user.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para detalhe</Link><div><h1 className="text-2xl font-semibold text-foreground">Editar usuário</h1></div></div><form action={saveUserAction} className="space-y-6 max-w-4xl"><input type="hidden" name="userId" value={user.id} /><FormSection title="Dados de acesso"><div className="grid gap-4 md:grid-cols-2"><Field label="Nome" name="name" required defaultValue={user.name ?? ''} /><Field label="E-mail" name="email" type="email" required defaultValue={user.email ?? ''} /><Field label="Senha" name="password" type="password" placeholder="Preencha para trocar ou deixe o padrão" /><SelectField label="Company" name="companyId" defaultValue={user.companyId ?? ''} options={(companies?.result ?? []).map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /></div></FormSection><FormSection title="Configuração"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Tipo" name="type" defaultValue={user.type ?? 2} options={[{value:1,label:'Admin'},{value:2,label:'Company'}]} /><SelectField label="Status" name="status" defaultValue={user.status ?? 1} options={[{value:1,label:'Ativo'},{value:0,label:'Inativo'}]} /><Field label="Idioma" name="language" defaultValue="pt-BR" /><Field label="Tema" name="theme" defaultValue="dark" /></div></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar alterações</Button><Link href={`/admin/users/${user.id}`}><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
