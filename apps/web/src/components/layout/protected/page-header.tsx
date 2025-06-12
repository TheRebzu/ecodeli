'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title?: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container py-6">
        {/* Breadcrumb */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
            <Home className="h-4 w-4" />
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center space-x-1">
                <ChevronRight className="h-4 w-4" />
                {item.href ? (
                  <Link href={item.href} className="hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{item.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Titre et actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>

          {/* Actions de la page */}
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}


// Composant DashboardHeader pour compatibilité
export function DashboardHeader({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description?: string; 
  children?: React.ReactNode; 
}) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
