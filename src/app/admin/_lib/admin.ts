// NOTE: this module pulls in `next/headers` via getBackendSession,
// so it MUST stay server-only. If you need any of the helpers below
// from a client component, import them from `./list-utils` instead
// (those are the bits that don't touch headers / fetch-with-cookies).
import { redirect } from 'next/navigation';
import { getBackendSession } from '@/lib/auth/session';
import {
  fetchAgentsByCompany,
  fetchBillingPlans,
  fetchBillingSubscription,
  fetchBillingUsage,
  fetchCompaniesPaged,
  fetchLeadsPaged,
  fetchRuntimeConfigStatus,
  fetchSquadsByCompany,
  fetchUsersPaged,
  fetchWorkspacesByCompany,
  type OkestriaCompany,
  type OkestriaLead,
  type OkestriaPlan,
  type OkestriaSubscription,
  type OkestriaUsage,
  type OkestriaUser,
} from '@/lib/auth/api';

// Client-safe pieces (kept here as re-exports for backward compatibility).
export {
  buildPageHref,
  getPageNumber,
  getSearchTerm,
  getSingleParam,
  paginate,
  type AdminSearchParams,
} from './list-utils';

export type AdminBillingRow = {
  companyId: number;
  companyName: string;
  companyEmail: string;
  planName: string;
  planId?: number | null;
  amount: number | null;
  currency: string;
  subscriptionStatus: string;
  periodEnd: string | null;
  leadsUsed: number;
  leadsLimit: number | null;
  usersUsed: number;
  usersLimit: number | null;
  agentsUsed: number;
  agentsLimit: number | null;
};

export async function requireAdminSession() {
  const session = await getBackendSession();
  if (!session?.token) redirect('/login');
  if (session.role !== 'admin' && session.roleType !== 1) redirect('/company');
  return session;
}

export function filterCompanies(items: OkestriaCompany[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.email, item.cnpj].some((value) => (value ?? '').toLowerCase().includes(query)),
  );
}

export function filterUsers(items: OkestriaUser[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.name, item.email, String(item.companyId ?? '')].some((value) => (value ?? '').toLowerCase().includes(query)),
  );
}

export function filterLeads(items: OkestriaLead[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.businessName, item.contactName, item.email, item.phone, item.city, item.state].some((value) =>
      (value ?? '').toLowerCase().includes(query),
    ),
  );
}

export function filterBillingRows(items: AdminBillingRow[], query: string) {
  if (!query) return items;
  return items.filter((item) =>
    [item.companyName, item.companyEmail, item.planName, item.subscriptionStatus].some((value) =>
      value.toLowerCase().includes(query),
    ),
  );
}

export async function getAdminDashboardData(token: string) {
  const [companiesRes, usersRes, leadsRes] = await Promise.all([
    fetchCompaniesPaged(token, { pageNumber: 1, pageSize: 100 }).catch(() => null),
    fetchUsersPaged(token, { pageNumber: 1, pageSize: 100 }).catch(() => null),
    fetchLeadsPaged(token, { pageNumber: 1, pageSize: 100 }).catch(() => null),
  ]);

  const companies = companiesRes?.result ?? [];
  const [agentGroups, workspaceGroups, squadGroups, runtimeStatus] = await Promise.all([
    Promise.all(companies.map((company) => fetchAgentsByCompany(company.id, token).catch(() => []))),
    Promise.all(companies.map((company) => fetchWorkspacesByCompany(company.id, token).catch(() => []))),
    Promise.all(companies.map((company) => fetchSquadsByCompany(company.id, token).catch(() => []))),
    fetchRuntimeConfigStatus(token).catch(() => null),
  ]);

  return {
    companies,
    users: usersRes?.result ?? [],
    leads: leadsRes?.result ?? [],
    agents: agentGroups.flat(),
    workspaces: workspaceGroups.flat(),
    squads: squadGroups.flat(),
    runtimeConfigured: runtimeStatus?.configured === true,
    runtimeBaseUrl: runtimeStatus?.baseUrl ?? null,
    runtimeHasToken: runtimeStatus?.hasUpstreamToken === true,
  };
}

function pickPlanName(subscription: OkestriaSubscription | null, plans: OkestriaPlan[]) {
  if (subscription?.planName?.trim()) return subscription.planName.trim();
  const matchedPlan = plans.find((plan) => plan.id != null && plan.id === subscription?.planId);
  if (matchedPlan?.name?.trim()) return matchedPlan.name.trim();
  return 'No plan';
}

export async function getAdminBillingData(token: string) {
  const [companiesRes, plansRes] = await Promise.all([
    fetchCompaniesPaged(token, { pageNumber: 1, pageSize: 100 }).catch(() => null),
    fetchBillingPlans(token).catch(() => [] as OkestriaPlan[]),
  ]);

  const companies = companiesRes?.result ?? [];

  const rows = await Promise.all(
    companies.map(async (company) => {
      const [subscription, usage] = await Promise.all([
        fetchBillingSubscription(company.id, token).catch(() => null),
        fetchBillingUsage(company.id, token).catch(() => null),
      ]);

      const row: AdminBillingRow = {
        companyId: company.id,
        companyName: company.name?.trim() || `Company #${company.id}`,
        companyEmail: company.email?.trim() || 'No email',
        planName: pickPlanName(subscription, plansRes),
        planId: subscription?.planId ?? null,
        amount: subscription?.amount ?? null,
        currency: subscription?.currency?.trim() || 'BRL',
        subscriptionStatus: subscription?.status?.trim().toLowerCase() || 'unknown',
        periodEnd: subscription?.currentPeriodEndUtc ?? null,
        leadsUsed: usage?.leadsUsed ?? 0,
        leadsLimit: usage?.leadsLimit ?? null,
        usersUsed: usage?.usersUsed ?? 0,
        usersLimit: usage?.usersLimit ?? null,
        agentsUsed: usage?.agentsUsed ?? 0,
        agentsLimit: usage?.agentsLimit ?? null,
      };

      return row;
    }),
  );

  return { companies, plans: plansRes, rows };
}
