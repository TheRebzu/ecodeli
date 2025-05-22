'use client';

import { cn } from '@/lib/utils';

export function DashboardShell({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}
