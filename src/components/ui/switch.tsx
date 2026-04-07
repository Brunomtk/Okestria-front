import * as React from 'react';
import { cn } from '@/lib/utils';

export function Switch({ className, checked, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn('h-4 w-4 rounded border-border', className)} checked={checked} {...props} />;
}
