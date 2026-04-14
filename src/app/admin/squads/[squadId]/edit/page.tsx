import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit } from 'lucide-react';
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
      companies.map(async (company) => [
        company.id,
        await fetchSquadCatalogByCompany(company.id, session.token!).catch(() => ({ companyId: company.id, agents: [], workspaces: [] })),
      ]),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href={`/admin/squads/${squad.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para detalhe
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Edit className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Editar squad</h1>
            <p className="text-sm text-muted-foreground">
              Editando <strong className="text-foreground">{squad.name ?? `Squad #${squad.id}`}</strong> — ajuste membros, workspace, leader e modo.
            </p>
          </div>
        </div>
      </div>

      <AdminSquadForm mode="edit" companies={companies} catalogs={catalogs} squad={squad} action={saveSquadAction} cancelHref={`/admin/squads/${squad.id}`} />
    </div>
  );
}
