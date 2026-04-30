import { Building2, Mail, Shield, UserCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { fetchCompaniesPaged, fetchUserById } from "@/lib/auth/api";
import { deleteUserAction } from "../../_actions";
import { requireAdminSession } from "../../_lib/admin";
import { Section } from "../../_components/AdminUI";
import {
  DetailActionLink,
  DetailFact,
  DetailHeader,
  DetailTagPill,
} from "../../_components/AdminDetail";
import { AdminDeleteButton } from "../../_components/AdminDeleteButton";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const session = await requireAdminSession();
  const [user, companies] = await Promise.all([
    fetchUserById(id, session.token!).catch(() => null),
    fetchCompaniesPaged(session.token!, { pageNumber: 1, pageSize: 200 }).catch(
      () => null,
    ),
  ]);
  if (!user) notFound();

  const companyName = user.companyId
    ? (companies?.result ?? []).find((item) => item.id === user.companyId)
        ?.name ?? `Company #${user.companyId}`
    : "—";

  const typeLabel =
    user.type === 1 ? "Admin" : user.type === 2 ? "Company" : "User";

  return (
    <div className="space-y-8">
      <DetailHeader
        backHref="/admin/users"
        backLabel="Back to users"
        eyebrow={`User · #${user.id}`}
        title={user.name ?? `User #${user.id}`}
        subtitle="Live administrative view of the user account."
        pills={
          <>
            <DetailTagPill variant={user.status === 1 ? "emerald" : "outline"}>
              {user.status === 1 ? "active" : "inactive"}
            </DetailTagPill>
            <DetailTagPill>ID #{user.id}</DetailTagPill>
            <DetailTagPill variant="violet">{typeLabel.toLowerCase()}</DetailTagPill>
          </>
        }
        actions={
          <>
            <DetailActionLink
              href={`/admin/users/${user.id}/edit`}
              accent="violet"
            >
              Edit
            </DetailActionLink>
            <form action={deleteUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <AdminDeleteButton />
            </form>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Section title="Identity" subtitle="profile" accent="cyan">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-cyan-200"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.25) 0%, rgba(167,139,250,0.18) 60%, transparent 100%)",
                border: "1px solid rgba(34,211,238,0.30)",
              }}
            >
              <UserCircle2 className="h-12 w-12" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white/95">
                {user.name ?? "—"}
              </p>
              <p className="font-mono text-[11px] text-white/50">
                {user.email ?? "no email"}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Account" subtitle="primary record" accent="violet">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <DetailFact label="Email" value={user.email ?? "—"} icon={Mail} />
            <DetailFact label="Role" value={typeLabel} icon={Shield} />
            <DetailFact
              label="Linked tenant"
              value={companyName}
              icon={Building2}
            />
            <DetailFact
              label="Status"
              value={user.status === 1 ? "Active" : "Inactive"}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
