import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'destructive';
const variantClasses: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary border border-primary/20',
  secondary: 'bg-muted text-muted-foreground border border-border',
  outline: 'bg-transparent text-foreground border border-border',
  destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
};

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', variantClasses[variant], className)} {...props} />;
}
