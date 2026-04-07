import { Layers3, Sparkles } from "lucide-react";

type CreateTargetModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateAgent: () => void;
  onCreateSquad: () => void;
};

export function CreateTargetModal({
  open,
  onClose,
  onCreateAgent,
  onCreateSquad,
}: CreateTargetModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0a0603] shadow-[0_32px_120px_rgba(0,0,0,0.72)]">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/70">
            Create workspace item
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">What do you want to create?</h2>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            Start a new single agent or group multiple agents into a squad that can receive tasks from chat.
          </p>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <button
            type="button"
            onClick={onCreateAgent}
            className="group rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-5 text-left transition hover:border-cyan-300/45 hover:bg-cyan-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/65">Single agent</div>
            <div className="mt-2 text-lg font-semibold text-white">Create an agent</div>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Use the full agent wizard with identity, soul, avatar and default OpenClaw setup.
            </p>
          </button>

          <button
            type="button"
            onClick={onCreateSquad}
            className="group rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5 text-left transition hover:border-amber-300/45 hover:bg-amber-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-100">
              <Layers3 className="h-5 w-5" />
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/65">Multi agent</div>
            <div className="mt-2 text-lg font-semibold text-white">Create a squad</div>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Group agents into a leader-based or fan-out team, then talk to the squad directly from chat.
            </p>
          </button>
        </div>

        <div className="flex justify-end border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
