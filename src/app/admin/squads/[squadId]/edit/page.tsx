import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { saveSquadAction } from '../../../_actions';
import { requireAdminSession } from '../../../_lib/admin';
import AdminSquadForm from '../../_components/AdminSquadForm';
import { fetchCompaniesPaged, fetchSquadById, fetchSquadCatalogByCompany } from '@/lib/auth/api';

export default async function AdminSquadEditPage({ params }: { params: Promise<{ squadId: string }> }) {
  const { squadId } = await params;
  const id = Number(squadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [squad, companiesResponse] = await Promise.all([
    fetchSquadById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null),
  ]);
  if (!squad) notFound();

  const companies = companiesResponse?.result ?? [];
  const catalogs = Object.fromEntries(
    await Promise.all(
      companies.map(async (company) => [company.id, await fetchSquadCatalogByCompany(company.id, session.token!).catch(() => ({ companyId: company.id, agents: [], workspaces: [] }))]),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href={`/admin/squads/${squad.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para detalhe</Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Editar squad</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste members, workspace, leader e modo padrão em um único fluxo.</p>
        </div>
      </div>

      <AdminSquadForm mode="edit" companies={companies} catalogs={catalogs} squad={squad} action={saveSquadAction} cancelHref={`/admin/squads/${squad.id}`} />
    </div>
  );
}
