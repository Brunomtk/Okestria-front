import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { saveSquadAction } from '../../_actions';
import { requireAdminSession } from '../../_lib/admin';
import AdminSquadForm from '../_components/AdminSquadForm';
import { fetchCompaniesPaged, fetchSquadCatalogByCompany } from '@/lib/auth/api';

export default async function AdminSquadNewPage() {
  const session = await requireAdminSession();
  const companies = (await fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(() => null))?.result ?? [];
  const catalogs = Object.fromEntries(
    await Promise.all(
      companies.map(async (company) => [company.id, await fetchSquadCatalogByCompany(company.id, session.token!).catch(() => ({ companyId: company.id, agents: [], workspaces: [] }))]),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/admin/squads" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para Squads</Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Novo squad</h1>
          <p className="mt-1 text-sm text-muted-foreground">Preencha o essencial e selecione os membros certos.</p>
        </div>
      </div>

      <AdminSquadForm mode="create" companies={companies} catalogs={catalogs} action={saveSquadAction} cancelHref="/admin/squads" />
    </div>
  );
}
