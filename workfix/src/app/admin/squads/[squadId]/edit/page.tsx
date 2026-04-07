
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSquadAction } from '../../../_actions';
import { FormSection, Field, SelectField, TextareaField } from '../../../_lib/forms';
import { requireAdminSession } from '../../../_lib/admin';
import { fetchAgentsByCompany, fetchCompaniesPaged, fetchSquadById } from '@/lib/auth/api';

export default async function AdminSquadEditPage({ params }: { params: Promise<{ squadId: string }> }) {
  const { squadId } = await params; const id = Number(squadId); if (!Number.isFinite(id) || id <= 0) notFound();
  const session = await requireAdminSession(); const [squad, companies] = await Promise.all([fetchSquadById(id, session.token!).catch(() => null), fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null)]); if (!squad) notFound();
  const agents = await fetchAgentsByCompany(squad.companyId, session.token!).catch(() => []);
  return <div className="space-y-6"><div className="space-y-3"><Link href={`/admin/squads/${squad.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para detalhe</Link><div><h1 className="text-2xl font-semibold text-foreground">Editar squad</h1></div></div><form action={saveSquadAction} className="space-y-6 max-w-4xl"><input type="hidden" name="squadId" value={squad.id} /><FormSection title="Dados principais"><div className="grid gap-4 md:grid-cols-2"><SelectField label="Company" name="companyId" defaultValue={squad.companyId} options={(companies?.result ?? []).map((c) => ({ value: c.id, label: c.name ?? `Company #${c.id}` }))} /><Field label="Nome" name="name" required defaultValue={squad.name ?? ''} /><Field label="Slug" name="slug" defaultValue={''} /><SelectField label="Leader agent" name="leaderAgentId" defaultValue={squad.leaderAgentId ?? ''} options={agents.map((a) => ({ value: a.id, label: a.name ?? `Agent #${a.id}` }))} /><SelectField label="Status" name="status" defaultValue={(squad.status ?? squad.isActive ?? true) ? 'true' : 'false'} options={[{value:'true',label:'Ativo'},{value:'false',label:'Inativo'}]} /></div><TextareaField label="Descrição" name="description" defaultValue={squad.description ?? ''} /></FormSection><div className="flex gap-2"><Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar alterações</Button><Link href={`/admin/squads/${squad.id}`}><Button type="button" variant="outline">Cancelar</Button></Link></div></form></div>
}
