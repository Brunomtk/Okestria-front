import { fetchCompaniesPaged, fetchSquadCatalogByCompany } from "@/lib/auth/api";
import { saveSquadAction } from "../../_actions";
import { FormShell } from "../../_lib/forms";
import { requireAdminSession } from "../../_lib/admin";
import AdminSquadForm from "../_components/AdminSquadForm";

export default async function AdminSquadNewPage() {
  const session = await requireAdminSession();
  const companies =
    (
      await fetchCompaniesPaged(session.token!, {
        pageNumber: 1,
        pageSize: 200,
      }).catch(() => null)
    )?.result ?? [];
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
      eyebrow="Operations"
      title="New squad"
      subtitle="Bundle 2–5 agents under a leader and shared mission. Pick the workspace they live in and the default execution mode."
      backHref="/admin/squads"
      backLabel="Back to squads"
    >
      <AdminSquadForm
        mode="create"
        companies={companies}
        catalogs={catalogs}
        action={saveSquadAction}
        cancelHref="/admin/squads"
      />
    </FormShell>
  );
}
