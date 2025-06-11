import { cn } from '@/lib/utils/common';
import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return <div className={cn('container mx-auto px-4 py-6 md:px-6', className)}>{children}</div>;
}
