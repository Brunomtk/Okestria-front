import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2, Layers3, Music4, ShieldCheck, Users } from 'lucide-react';
import { fetchAgentsByCompany, fetchRuntimeConfigStatus, fetchUsersByCompany, fetchWorkspacesByCompany } from '@/lib/auth/api';
import { getBackendSession } from '@/lib/auth/session';

export default async function CompanyIndexPage() {
  const session = await getBackendSession();

  if (!session) {
    redirect('/');
  }

  const [workspaceResponse, usersResponse, agentsResponse, runtimeStatus] = await Promise.all([
    session.token && session.companyId ? fetchWorkspacesByCompany(session.companyId, session.token).catch(() => []) : Promise.resolve([]),
    session.token && session.companyId ? fetchUsersByCompany(session.companyId, session.token).catch(() => []) : Promise.resolve([]),
    session.token && session.companyId ? fetchAgentsByCompany(session.companyId, session.token).catch(() => []) : Promise.resolve([]),
    session.token ? fetchRuntimeConfigStatus(session.token).catch(() => null) : Promise.resolve(null),
  ]);

  const defaultAgent = agentsResponse.find((agent) => agent.isDefault) ?? agentsResponse[0] ?? null;

  return (
    <div className="min-h-full bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/72">Company hub</div>
          <h1 className="mt-3 text-4xl font-semibold">{session.companyName ?? 'Sua company'}</h1>
          <p className="mt-2 text-sm text-slate-300/75">{session.workspaceName ?? 'Workspace operacional'} • área pronta para consumir dados reais do backend.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Usuários</div>
            <div className="mt-4 text-4xl font-semibold text-white">{usersResponse.length}</div>
            <div className="mt-2 text-sm text-slate-300/70">membros retornados pela API</div>
          </article>
          <article className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Workspaces</div>
            <div className="mt-4 text-4xl font-semibold text-white">{workspaceResponse.length}</div>
            <div className="mt-2 text-sm text-slate-300/70">workspaces ligados à company</div>
          </article>
          <article className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Agents</div>
            <div className="mt-4 text-4xl font-semibold text-white">{agentsResponse.length}</div>
            <div className="mt-2 text-sm text-slate-300/70">default sempre vem primeiro e vira a base operacional da company</div>
          </article>
          <article className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Runtime</div>
            <div className="mt-4 flex items-center gap-3 text-white"><ShieldCheck className="h-5 w-5 text-cyan-200" /> {runtimeStatus?.configured ? 'Configurado' : 'Aguardando configuração'}</div>
            <div className="mt-2 text-sm text-slate-300/70">token e gateway centralizados no backend</div>
          </article>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { href: '/company/office', label: 'Entrar no office', icon: Building2, desc: 'Ambiente operacional da company.' },
            { href: '/company/agents', label: 'Abrir agentes', icon: Users, desc: 'Área pronta para evolução de agentes e times.' },
            { href: '/company/spotify/callback', label: 'Spotify callback', icon: Music4, desc: 'Callback isolado para integrações de áudio.' },
          ].map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href} className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition hover:border-cyan-300/20 hover:bg-white/8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200"><Icon className="h-5 w-5" /></div>
              <div className="mt-4 text-xl font-semibold">{label}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300/75">{desc}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">Acessar <ArrowRight className="h-4 w-4" /></div>
            </Link>
          ))}
        </div>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Dados reais do backend</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-white"><Layers3 className="h-4 w-4 text-cyan-200" /> Workspaces</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300/76">
                {workspaceResponse.length ? workspaceResponse.map((workspace) => (
                  <li key={workspace.id} className="rounded-xl border border-white/6 bg-white/5 px-3 py-2">
                    <div className="font-medium text-white">{workspace.name ?? `Workspace #${workspace.id}`}</div>
                    <div className="text-xs text-slate-400">{workspace.description ?? 'Sem descrição'}</div>
                  </li>
                )) : <li className="text-slate-400">Nenhum workspace retornado.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-white"><Users className="h-4 w-4 text-cyan-200" /> Usuários da company</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300/76">
                {usersResponse.length ? usersResponse.map((user) => (
                  <li key={user.id} className="rounded-xl border border-white/6 bg-white/5 px-3 py-2">
                    <div className="font-medium text-white">{user.name ?? `Usuário #${user.id}`}</div>
                    <div className="text-xs text-slate-400">{user.email ?? 'Sem e-mail'} • tipo {user.type ?? '-'}</div>
                  </li>
                )) : <li className="text-slate-400">Nenhum usuário retornado.</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4 text-cyan-200" /> Agent default</div>
              {defaultAgent ? (
                <div className="mt-3 rounded-xl border border-cyan-300/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{defaultAgent.name ?? `Agent #${defaultAgent.id}`}</div>
                      <div className="text-xs text-slate-400">{defaultAgent.role ?? 'Assistant'} • slug {(defaultAgent.slug ?? 'default').trim() || 'default'}</div>
                    </div>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      Default
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300/75">
                    Esse agent é a base inicial da company e aparece priorizado no front para evitar company sem configuração operacional.
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-white/6 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                  Nenhum agent retornado pela API.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
