import * as React from 'react';
import { cn } from '@/lib/utils';

export function DropdownMenu({ children }: { children: React.ReactNode }) { return <div className="relative inline-flex">{children}</div>; }
export function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) { return <>{children}</>; }
export function DropdownMenuContent({ children, className }: { children: React.ReactNode; align?: 'start' | 'end'; className?: string }) {
  return <div className={cn('invisible absolute right-0 top-full z-20 mt-2 min-w-40 rounded-lg border border-border bg-popover p-1 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100 data-[state=open]:visible data-[state=open]:opacity-100', className)}>{children}</div>;
}
export function DropdownMenuItem({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent', className)} {...props}>{children}</div>;
}
