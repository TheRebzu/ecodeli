'use client';

import { ReactNode } from 'react';

interface HeadingProps {
  title: string;
  description: string;
  className?: string;
  icon?: ReactNode;
}

export function Heading({ title, description, className, icon }: HeadingProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
