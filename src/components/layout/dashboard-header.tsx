'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  text,
  children,
  className,
  ...props
}: DashboardHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2 pb-5', className)} {...props}>
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {text && <p className="text-muted-foreground">{text}</p>}
      </div>
      {children}
    </div>
  );
}
