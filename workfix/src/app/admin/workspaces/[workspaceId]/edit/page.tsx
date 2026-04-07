
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveWorkspaceAction } from '../../../_actions';
import { FormSection, Field, SelectField, TextareaField } from '../../../_lib/forms';
import { requireAdminSession } from '../../../_lib/admin';
import { fetchCompaniesPaged, fetchWorkspaceById } from '@/lib/auth/api';

export default async function AdminWorkspaceEditPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params; const id = Number(workspaceId); if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession(); const [workspace, companies] = await Promise.all([fetchWorkspaceById(id, session.token!).catch(() => null), fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null)]); if (!workspace) notFound();
  return <div className="space-y-6"><div className="space-y-3"><Link href={`/admin/workspaces/${workspace.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para detalhe</Link><div><h1 className="text-2xl font-semibold text-foreground">Editar workspace</h1></div></div><form action={saveWorkspaceAction} className="space-y-6 max-w-4xl"><input type="hidden" name="workspaceId" value={workspace.id} /><FormSection title="Dados principais"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Company" name="companyId" defaultValue={workspace.companyId} options={(companies?.result ?? []).map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /><Field label="Nome" name="name" required defaultValue={workspace.name ?? ''} /><SelectField label="Status" name="status" defaultValue={workspace.status ? 'true' : 'false'} options={[{value:'true',label:'Ativo'},{value:'false',label:'Inativo'}]} /></div><TextareaField label="Descrição" name="description" defaultValue={workspace.description ?? ''} /></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar alterações</Button><Link href={`/admin/workspaces/${workspace.id}`}><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
