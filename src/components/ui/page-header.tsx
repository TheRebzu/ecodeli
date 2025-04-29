import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  heading: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ heading, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 pb-5', className)}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">{heading}</h1>
          {description && <p className="text-lg text-muted-foreground">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
