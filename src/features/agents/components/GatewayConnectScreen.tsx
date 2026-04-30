'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GatewayStatus } from '@/lib/gateway/GatewayClient';
import type { StudioGatewaySettings } from '@/lib/studio/settings';
import {
  isAuthExpired,
  onAuthExpired,
} from '@/lib/auth/session-client';
// v142.8 — Use the polished OrkestriaLoader (mark + cosmic bg +
// cycling messages + gradient sweep bar) for the connecting state
// instead of the bespoke spinner-and-text layout that lived here.
// We only render OrkestriaLoader on the happy "connecting" path —
// the session-expired and error branches keep their custom UIs
// because they need actionable buttons.
import { OrkestriaLoader } from '@/components/OrkestriaLoader';

type GatewayConnectScreenProps = {
  gatewayUrl: string;
  token: string;
  localGatewayDefaults: StudioGatewaySettings | null;
  status: GatewayStatus;
  error: string | null;
  showApprovalHint: boolean;
  onGatewayUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onUseLocalDefaults: () => void;
  onConnect: () => void;
};

const loadingMessages = [
  'Initializing workspace...',
  'Connecting to agents...',
  'Loading your squads...',
  'Preparing dashboard...',
  'Syncing knowledge base...',
  'Almost there...',
];

export const GatewayConnectScreen = ({
  status,
  error,
  onConnect,
  gatewayUrl,
}: GatewayConnectScreenProps) => {
  const router = useRouter();
  const [currentMessage, setCurrentMessage] = useState(0);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(() => isAuthExpired());

  // Listen for the auth-expired event so the UI can swap "Waiting..." for
  // a "Sua sessão expirou" call-to-action instead of spinning forever.
  useEffect(() => {
    if (isAuthExpired()) setSessionExpired(true);
    return onAuthExpired(() => setSessionExpired(true));
  }, []);

  // Auto-connect on mount — but not after the session has expired, since
  // that would just bounce off the WS proxy and come straight back here.
  useEffect(() => {
    if (sessionExpired) return;
    if (!autoConnectAttempted && gatewayUrl && status === 'disconnected') {
      setAutoConnectAttempted(true);
      const timer = setTimeout(() => {
        onConnect();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoConnectAttempted, gatewayUrl, status, onConnect, sessionExpired]);

  // Cycle through messages
  useEffect(() => {
    if (sessionExpired) return;
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(messageInterval);
  }, [sessionExpired]);

  const handleSignInAgain = () => {
    // Preserve whatever screen the user was on so login bounces them back
    // exactly where they left off — the whole point of not "kicking them
    // out" is that the next click should land them back in context.
    let returnTo = '/';
    if (typeof window !== 'undefined') {
      const { pathname, search, hash } = window.location;
      returnTo = `${pathname}${search}${hash}` || '/';
    }
    const params = new URLSearchParams({ returnTo });
    router.push(`/login?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a14] overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/8 via-violet-500/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,179,237,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(99,179,237,0.02)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {sessionExpired ? (
          <>
            {/* Expired session — calm, reassuring lock icon */}
            <div className="relative w-20 h-20 mb-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/20" />
              <div className="absolute inset-2 rounded-full bg-amber-400/5" />
              <svg
                className="relative w-9 h-9 text-amber-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M3.75 21.75h16.5a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 12v8.25a1.5 1.5 0 0 0 1.5 1.5Z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-2 text-white tracking-tight">
              Sessão expirada
            </h1>
            <p className="text-white/50 text-sm mb-8 max-w-sm text-center leading-relaxed">
              Sua sessão ficou ociosa por muito tempo e o acesso foi
              encerrado por segurança. Entre novamente para continuar de
              onde parou — a tela onde você estava será restaurada.
            </p>

            <button
              type="button"
              onClick={handleSignInAgain}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            >
              Entrar novamente
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            <p className="mt-6 text-[11px] text-white/30 tracking-wide">
              Nada do seu trabalho foi perdido.
            </p>
          </>
        ) : !error ? (
          // Happy connecting path — render the polished OrkestriaLoader
          // exactly as it appears on every other "wait for the
          // workspace" surface. It already includes the brand mark,
          // cycling messages, and the gradient sweep bar.
          <OrkestriaLoader
            showProgress={false}
            messages={[
              "Reaching the gateway…",
              "Authenticating session…",
              "Wiring up agents…",
              "Loading your squads…",
              "Almost there…",
            ]}
          />
        ) : (
          <>
            {/* ERROR PATH — keeps a compact custom layout because it
                needs the retry + back-to-login buttons that the
                generic loader doesn't carry. */}
            <div className="relative w-20 h-20 mb-10">
              <div className="absolute inset-0 rounded-full border-2 border-rose-500/15" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="h-9 w-9 text-rose-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Zm9.303-2.626h.008v.008h-.008Z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-semibold mb-2 text-white tracking-tight">
              Orkestria
            </h1>

            <div className="mb-6 max-w-md text-center">
              <p className="text-[12.5px] leading-relaxed text-rose-300/90">
                {error}
              </p>
            </div>

            {/* Connection status */}
            <div className="mt-2 flex items-center gap-2 text-xs text-white/30">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                status === 'connecting'
                  ? 'bg-cyan-400 animate-pulse'
                  : status === 'connected'
                    ? 'bg-emerald-400'
                    : error
                      ? 'bg-rose-400'
                      : 'bg-white/20'
              }`} />
              <span className="font-light">
                {status === 'connecting'
                  ? 'Connecting...'
                  : status === 'connected'
                    ? 'Connected'
                    : error
                      ? 'Connection failed'
                      : 'Waiting...'}
              </span>
            </div>

            {/* Actions — only surfaced when there's an error so the
                screen stays minimal during normal connect attempts. */}
            {error ? (
              <div className="mt-7 flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAutoConnectAttempted(false);
                      onConnect();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2 text-[13px] font-medium text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Tentar novamente
                  </button>
                  <button
                    type="button"
                    onClick={handleSignInAgain}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-5 py-2 text-[13px] font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                      />
                    </svg>
                    Voltar ao login
                  </button>
                </div>
                <p className="max-w-md text-center text-[10.5px] leading-relaxed text-white/35">
                  Se o problema persistir, peça ao administrador para checar
                  se o gateway OpenClaw está rodando e se o endereço configurado
                  está correto.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Keyframe animation */}
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};
