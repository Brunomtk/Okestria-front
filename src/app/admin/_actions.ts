'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getBackendSession } from '@/lib/auth/session';
import {
  cancelCronJob,
  createAgent,
  createCompany,
  createLead,
  createSquad,
  createUser,
  createWorkspace,
  deleteAgent,
  deleteCompany,
  deleteCronJob,
  deleteSquad,
  deleteUser,
  generateLeadInsights,
  pauseCronJob,
  resumeCronJob,
  runCronJob,
  toggleCompanyStatus,
  updateAgent,
  updateCompany,
  updateCronJob,
  updateLead,
  updateSquad,
  updateUser,
  updateWorkspace,
} from '@/lib/auth/api';

async function requireToken() {
  const session = await getBackendSession();
  if (!session?.token) redirect('/login');
  return session.token;
}

function getPath(formData: FormData, fallback: string) {
  const raw = String(formData.get('redirectTo') ?? '').trim();
  return raw || fallback;
}

function asString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function asNullableString(formData: FormData, key: string) {
  const value = asString(formData, key);
  return value || null;
}

function asNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function asBool(formData: FormData, key: string, truthy = 'true') {
  return String(formData.get(key) ?? '').toLowerCase() == truthy.toLowerCase();
}

export async function toggleCompanyStatusAction(formData: FormData) {
  const token = await requireToken();
  const companyId = Number(formData.get('companyId'));
  const path = getPath(formData, '/admin/companies');
  if (Number.isFinite(companyId) && companyId > 0) await toggleCompanyStatus(companyId, token).catch(() => null);
  revalidatePath('/admin');
  revalidatePath('/admin/companies');
  redirect(path);
}

export async function deleteCompanyAction(formData: FormData) {
  const token = await requireToken();
  const companyId = Number(formData.get('companyId'));
  if (Number.isFinite(companyId) && companyId > 0) await deleteCompany(companyId, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/companies'); redirect('/admin/companies');
}

export async function saveCompanyAction(formData: FormData) {
  const token = await requireToken();
  const companyId = asNumber(formData, 'companyId');
  const payload = { name: asString(formData, 'name'), email: asString(formData, 'email'), cnpj: asNullableString(formData, 'cnpj'), status: asBool(formData, 'status') };
  if (companyId > 0) await updateCompany(companyId, payload, token).catch(() => null);
  else await createCompany(payload, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/companies'); redirect('/admin/companies');
}

export async function deleteUserAction(formData: FormData) {
  const token = await requireToken();
  const userId = Number(formData.get('userId'));
  const path = getPath(formData, '/admin/users');
  if (Number.isFinite(userId) && userId > 0) await deleteUser(userId, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/users'); redirect(path);
}

export async function saveUserAction(formData: FormData) {
  const token = await requireToken();
  const userId = asNumber(formData, 'userId');
  const payload = {
    name: asString(formData, 'name'),
    email: asString(formData, 'email'),
    password: asString(formData, 'password') || '123456',
    type: asNumber(formData, 'type', 2),
    status: asNumber(formData, 'status', 1),
    companyId: asNumber(formData, 'companyId') || null,
    language: asNullableString(formData, 'language'),
    theme: asNullableString(formData, 'theme'),
  };
  if (userId > 0) await updateUser(userId, payload, token).catch(() => null);
  else await createUser(payload, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/users'); redirect('/admin/users');
}

export async function deleteAgentAction(formData: FormData) {
  const token = await requireToken();
  const agentId = Number(formData.get('agentId'));
  if (Number.isFinite(agentId) && agentId > 0) await deleteAgent(agentId, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/agents'); redirect('/admin/agents');
}

export async function saveAgentAction(formData: FormData) {
  const token = await requireToken();
  const agentId = asNumber(formData, 'agentId');
  const payload = {
    companyId: asNumber(formData, 'companyId'),
    name: asString(formData, 'name'),
    slug: asNullableString(formData, 'slug'),
    role: asNullableString(formData, 'role'),
    description: asNullableString(formData, 'description'),
    avatarUrl: asNullableString(formData, 'avatarUrl'),
    emoji: asNullableString(formData, 'emoji'),
    status: asBool(formData, 'status'),
    isDefault: asBool(formData, 'isDefault'),
  };
  if (agentId > 0) await updateAgent(agentId, payload, token).catch(() => null);
  else await createAgent(payload, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/agents'); redirect('/admin/agents');
}

export async function saveWorkspaceAction(formData: FormData) {
  const token = await requireToken();
  const workspaceId = asNumber(formData, 'workspaceId');
  const payload = {
    companyId: asNumber(formData, 'companyId'),
    name: asString(formData, 'name'),
    description: asNullableString(formData, 'description'),
    status: asBool(formData, 'status'),
  };
  if (workspaceId > 0) await updateWorkspace(workspaceId, payload, token).catch(() => null);
  else await createWorkspace(payload, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/workspaces'); redirect('/admin/workspaces');
}

export async function deleteSquadAction(formData: FormData) {
  const token = await requireToken();
  const squadId = Number(formData.get('squadId'));
  if (Number.isFinite(squadId) && squadId > 0) await deleteSquad(squadId, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/squads'); redirect('/admin/squads');
}

export async function saveSquadAction(formData: FormData) {
  const token = await requireToken();
  const squadId = asNumber(formData, 'squadId');
  const companyId = asNumber(formData, 'companyId');
  const leaderAgentId = asNumber(formData, 'leaderAgentId');
  const workspaceId = asNumber(formData, 'workspaceId');
  const selectedMembers = formData
    .getAll('memberAgentIds')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  const uniqueMemberIds = Array.from(new Set(selectedMembers));
  if (leaderAgentId > 0 && !uniqueMemberIds.includes(leaderAgentId)) uniqueMemberIds.unshift(leaderAgentId);

  const payload = {
    companyId,
    name: asString(formData, 'name'),
    slug: asNullableString(formData, 'slug'),
    description: asNullableString(formData, 'description'),
    iconEmoji: asNullableString(formData, 'iconEmoji'),
    color: asNullableString(formData, 'color'),
    avatarUrl: asNullableString(formData, 'avatarUrl'),
    leaderAgentId: leaderAgentId > 0 ? leaderAgentId : null,
    workspaceId: workspaceId > 0 ? workspaceId : null,
    defaultExecutionMode: asNullableString(formData, 'defaultExecutionMode') ?? 'manual',
    status: asBool(formData, 'status'),
    members: uniqueMemberIds.map((agentId, index) => ({
      agentId,
      isLeader: leaderAgentId > 0 && agentId === leaderAgentId,
      canReceiveTasks: true,
      order: index,
    })),
  };

  if (squadId > 0) await updateSquad(squadId, payload, token).catch(() => null);
  else await createSquad(payload, token).catch(() => null);

  revalidatePath('/admin');
  revalidatePath('/admin/squads');
  redirect('/admin/squads');
}

export async function saveLeadAction(formData: FormData) {
  const token = await requireToken();
  const leadId = asNumber(formData, 'leadId');
  const payload = {
    companyId: asNumber(formData, 'companyId'),
    businessName: asString(formData, 'businessName'),
    contactName: asNullableString(formData, 'contactName'),
    email: asNullableString(formData, 'email'),
    phone: asNullableString(formData, 'phone'),
    city: asNullableString(formData, 'city'),
    state: asNullableString(formData, 'state'),
    status: asNullableString(formData, 'status') ?? 'new',
  };
  if (leadId > 0) await updateLead(leadId, payload, token).catch(() => null);
  else await createLead(payload, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/leads'); redirect('/admin/leads');
}

export async function generateLeadInsightsAction(formData: FormData) {
  const token = await requireToken();
  const leadId = Number(formData.get('leadId'));
  const path = getPath(formData, '/admin/leads');
  if (Number.isFinite(leadId) && leadId > 0) await generateLeadInsights(leadId, token).catch(() => null);
  revalidatePath('/admin'); revalidatePath('/admin/leads'); redirect(path);
}

// ── v149 — Cron job actions (admin) ─────────────────────────────────

function cronPaths(jobId: number) {
  revalidatePath('/admin');
  revalidatePath('/admin/cron');
  revalidatePath(`/admin/cron/${jobId}`);
}

export async function runCronJobAction(formData: FormData) {
  const token = await requireToken();
  const jobId = Number(formData.get('jobId'));
  const onlyIfDue = String(formData.get('onlyIfDue') ?? '').trim() === 'true';
  const override = asNullableString(formData, 'systemEventOverride');
  const path = getPath(formData, `/admin/cron/${jobId}`);
  if (Number.isFinite(jobId) && jobId > 0) {
    await runCronJob(jobId, { onlyIfDue, systemEventOverride: override }, token).catch(() => null);
    cronPaths(jobId);
  }
  redirect(path);
}

export async function pauseCronJobAction(formData: FormData) {
  const token = await requireToken();
  const jobId = Number(formData.get('jobId'));
  const path = getPath(formData, `/admin/cron/${jobId}`);
  if (Number.isFinite(jobId) && jobId > 0) {
    await pauseCronJob(jobId, token).catch(() => null);
    cronPaths(jobId);
  }
  redirect(path);
}

export async function resumeCronJobAction(formData: FormData) {
  const token = await requireToken();
  const jobId = Number(formData.get('jobId'));
  const path = getPath(formData, `/admin/cron/${jobId}`);
  if (Number.isFinite(jobId) && jobId > 0) {
    await resumeCronJob(jobId, token).catch(() => null);
    cronPaths(jobId);
  }
  redirect(path);
}

export async function cancelCronJobAction(formData: FormData) {
  const token = await requireToken();
  const jobId = Number(formData.get('jobId'));
  const path = getPath(formData, `/admin/cron/${jobId}`);
  if (Number.isFinite(jobId) && jobId > 0) {
    await cancelCronJob(jobId, token).catch(() => null);
    cronPaths(jobId);
  }
  redirect(path);
}

export async function deleteCronJobAction(formData: FormData) {
  const token = await requireToken();
  const jobId = Number(formData.get('jobId'));
  const path = getPath(formData, '/admin/cron');
  if (Number.isFinite(jobId) && jobId > 0) {
    await deleteCronJob(jobId, token).catch(() => null);
    revalidatePath('/admin');
    revalidatePath('/admin/cron');
  }
  redirect(path);
}

export async function saveCronJobAction(formData: FormData) {
  const token = await requireToken();
  const jobId = Number(formData.get('jobId'));
  const payload = {
    name: asString(formData, 'name'),
    description: asNullableString(formData, 'description'),
    cronExpression: asNullableString(formData, 'cronExpression'),
    systemEvent: asString(formData, 'systemEvent'),
    timezone: asString(formData, 'timezone') || 'UTC',
    status: asString(formData, 'status') || 'active',
  };
  if (Number.isFinite(jobId) && jobId > 0) {
    await updateCronJob(jobId, payload, token).catch(() => null);
    cronPaths(jobId);
    redirect(`/admin/cron/${jobId}`);
  }
  redirect('/admin/cron');
}
