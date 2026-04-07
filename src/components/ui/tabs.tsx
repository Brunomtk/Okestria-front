import * as React from "react";
import { cn } from "@/lib/utils";

type TabsProps = {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  className?: string;
};

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value?: string;
};

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
};

export function Tabs({ children, className }: TabsProps) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function TabsList({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-muted p-1", className)} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ children, className, value, type, ...props }: TabsTriggerProps) {
  return (
    <button
      type={type ?? "button"}
      data-value={value}
      className={cn("rounded-md px-3 py-1.5 text-sm text-foreground hover:bg-background", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, className, value, ...props }: TabsContentProps) {
  return (
    <div data-value={value} className={cn(className)} {...props}>
      {children}
    </div>
  );
}
