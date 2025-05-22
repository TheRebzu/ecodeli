'use client';

import { cn } from '@/lib/utils';

<<<<<<< HEAD
export function DashboardShell({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
=======
interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardShell({ children, className, ...props }: DashboardShellProps) {
>>>>>>> amine
  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}
