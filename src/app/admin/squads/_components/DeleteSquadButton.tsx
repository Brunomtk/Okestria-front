'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DeleteSquadButtonProps = {
  squadId: number;
  squadName: string;
  action: (formData: FormData) => void | Promise<void>;
  variant?: 'button' | 'dropdown';
};

export default function DeleteSquadButton({ squadId, squadName, action, variant = 'button' }: DeleteSquadButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    const formData = new FormData();
    formData.set('squadId', String(squadId));
    startTransition(() => {
      action(formData);
    });
  };

  const trigger =
    variant === 'dropdown' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </button>
    ) : (
      <Button type="button" variant="destructive" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    );

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPending && setOpen(false)} />
          <div className="relative z-50 w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Excluir squad</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Tem certeza que deseja excluir o squad <strong className="text-foreground">&quot;{squadName}&quot;</strong>?
                  Todos os membros, tasks e runs associados serão removidos permanentemente.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleConfirm} disabled={isPending} className="gap-2">
                {isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Excluindo...
                  </span>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Sim, excluir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
