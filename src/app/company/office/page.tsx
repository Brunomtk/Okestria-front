import { Suspense } from "react";
import { AgentStoreProvider } from "@/features/agents/state/store";
import { OfficeScreen } from "@/features/office/screens/OfficeScreen";
import { getBackendSession } from "@/lib/auth/session";
import { fetchOfficeLayoutByCompany } from "@/lib/auth/api";
import { parseCompanyOfficeLayoutJson } from "@/lib/office/companyLayout";
import type { FurnitureItem } from "@/features/retro-office/core/types";

const ENABLED_RE = /^(1|true|yes|on)$/i;

const readDebugFlag = (value: string | undefined): boolean => {
  const normalized = (value ?? "").trim();
  if (!normalized) return true;
  return ENABLED_RE.test(normalized);
};

function OfficeLoadingFallback() {
  return (
    <div
      className="flex h-screen w-full items-center justify-center bg-slate-950"
      aria-label="Loading office"
      role="status"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
        <p className="font-mono text-[11px] tracking-[0.08em] text-slate-400">
          Loading office...
        </p>
      </div>
    </div>
  );
}

export default async function CompanyOfficePage() {
  const showOpenClawConsole = readDebugFlag(process.env.DEBUG);
  const session = await getBackendSession();
  let initialOfficeFurniture: FurnitureItem[] | null = null;

  if (session?.token && session.companyId) {
    try {
      const officeLayout = await fetchOfficeLayoutByCompany(session.companyId, session.token);
      initialOfficeFurniture =
        parseCompanyOfficeLayoutJson(officeLayout.layoutJson)?.furniture ?? null;
    } catch {
      initialOfficeFurniture = null;
    }
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <AgentStoreProvider>
        <Suspense fallback={<OfficeLoadingFallback />}>
          <OfficeScreen
            showOpenClawConsole={showOpenClawConsole}
            companyId={session?.companyId ?? null}
            workspaceId={session?.workspaceId ?? null}
            companyName={session?.companyName ?? null}
            workspaceName={session?.workspaceName ?? null}
            initialOfficeFurniture={initialOfficeFurniture}
          />
        </Suspense>
      </AgentStoreProvider>
    </div>
  );
}
