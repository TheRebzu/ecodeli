"use client";

import { cn } from "@/lib/utils/common";

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardShell({
  children,
  className,
  ...props
}: DashboardShellProps) {
  return (
    <div
      className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}
