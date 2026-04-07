
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveAgentAction } from '../../../_actions';
import { FormSection, Field, SelectField, TextareaField } from '../../../_lib/forms';
import { requireAdminSession } from '../../../_lib/admin';
import { fetchAgentById, fetchCompaniesPaged } from '@/lib/auth/api';

export default async function AdminAgentEditPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params; const id = Number(agentId); if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession(); const [agent, companies] = await Promise.all([fetchAgentById(id, session.token!).catch(() => null), fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null)]); if (!agent) notFound();
  return <div className="space-y-6"><div className="space-y-3"><Link href={`/admin/agents/${agent.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para detalhe</Link><div><h1 className="text-2xl font-semibold text-foreground">Editar agent</h1></div></div><form action={saveAgentAction} className="space-y-6 max-w-4xl"><input type="hidden" name="agentId" value={agent.id} /><FormSection title="Identidade"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Company" name="companyId" defaultValue={agent.companyId} options={(companies?.result ?? []).map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /><Field label="Nome" name="name" required defaultValue={agent.name ?? ''} /><Field label="Slug" name="slug" defaultValue={agent.slug ?? ''} /><Field label="Role" name="role" defaultValue={agent.role ?? ''} /><Field label="Emoji" name="emoji" defaultValue={agent.emoji ?? ''} /><Field label="Avatar URL" name="avatarUrl" defaultValue={agent.avatarUrl ?? ''} /></div><TextareaField label="Descrição" name="description" defaultValue={agent.description ?? ''} /></FormSection><FormSection title="Comportamento"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Status" name="status" defaultValue={agent.status ? 'true' : 'false'} options={[{value:'true',label:'Ativo'},{value:'false',label:'Inativo'}]} /><SelectField label="Default" name="isDefault" defaultValue={agent.isDefault ? 'true' : 'false'} options={[{value:'false',label:'Não'},{value:'true',label:'Sim'}]} /></div></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar alterações</Button><Link href={`/admin/agents/${agent.id}`}><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
