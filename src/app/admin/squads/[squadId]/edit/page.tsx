import { notFound } from "next/navigation";
import {
  fetchCompaniesPaged,
  fetchSquadById,
  fetchSquadCatalogByCompany,
} from "@/lib/auth/api";
import { saveSquadAction } from "../../../_actions";
import { FormShell } from "../../../_lib/forms";
import { requireAdminSession } from "../../../_lib/admin";
import AdminSquadForm from "../../_components/AdminSquadForm";

export default async function AdminSquadEditPage({
  params,
}: {
  params: Promise<{ squadId: string }>;
}) {
  const { squadId } = await params;
  const id = Number(squadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [squad, companiesResponse] = await Promise.all([
    fetchSquadById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!squad) notFound();

  const companies = companiesResponse?.result ?? [];
  const catalogs = Object.fromEntries(
    await Promise.all(
      companies.map(async (company) => [
        company.id,
        await fetchSquadCatalogByCompany(company.id, session.token!).catch(
          () => ({ companyId: company.id, agents: [], workspaces: [] }),
        ),
      ]),
    ),
  );

  return (
    <FormShell
      eyebrow={`#${squad.id}`}
      title={`Edit ${squad.name ?? "squad"}`}
      subtitle="Adjust members, workspace, leader and default execution mode in a single flow."
      backHref={`/admin/squads/${squad.id}`}
      backLabel="Back to squad"
    >
      <AdminSquadForm
        mode="edit"
        companies={companies}
        catalogs={catalogs}
        squad={squad}
        action={saveSquadAction}
        cancelHref={`/admin/squads/${squad.id}`}
      />
    </FormShell>
  );
}
