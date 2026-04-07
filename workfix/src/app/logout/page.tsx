'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession } from '@/lib/auth/session-client';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    clearAuthSession();
    router.replace('/');
    router.refresh();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061018] px-6 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6 text-center shadow-2xl backdrop-blur-xl">
        <div className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Okestria</div>
        <h1 className="mt-3 text-2xl font-semibold">Encerrando sessão</h1>
        <p className="mt-2 text-sm text-slate-300/75">Limpando credenciais e retornando para o login.</p>
      </div>
    </main>
  );
}
