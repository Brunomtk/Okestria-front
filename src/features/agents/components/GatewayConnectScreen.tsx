'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GatewayStatus } from '@/lib/gateway/GatewayClient';
import type { StudioGatewaySettings } from '@/lib/studio/settings';
import {
  isAuthExpired,
  onAuthExpired,
} from '@/lib/auth/session-client';

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
        ) : (
          <>
            {/* Elegant spinner */}
            <div className="relative w-20 h-20 mb-10">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10" />

              {/* Spinning arc */}
              <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '1.5s' }}>
                <circle
                  cx="40"
                  cy="40"
                  r="38"
                  fill="none"
                  stroke="url(#spinnerGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="80 160"
                />
                <defs>
                  <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 animate-pulse" />
              </div>
            </div>

            {/* Brand */}
            <h1 className="text-2xl font-semibold mb-2 text-white tracking-tight">
              Orkestria
            </h1>

            {/* Status message */}
            <div className="h-6 mb-8">
              <p className="text-white/40 text-sm transition-opacity duration-300">
                {error ? (
                  <span className="text-rose-400 text-xs">{error}</span>
                ) : (
                  loadingMessages[currentMessage]
                )}
              </p>
            </div>

            {/* Minimal loading bar */}
            <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
            </div>

            {/* Connection status */}
            <div className="mt-8 flex items-center gap-2 text-xs text-white/30">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                status === 'connecting'
                  ? 'bg-cyan-400 animate-pulse'
                  : status === 'connected'
                    ? 'bg-emerald-400'
                    : 'bg-white/20'
              }`} />
              <span className="font-light">
                {status === 'connecting'
                  ? 'Connecting...'
                  : status === 'connected'
                    ? 'Connected'
                    : 'Waiting...'}
              </span>
            </div>
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
