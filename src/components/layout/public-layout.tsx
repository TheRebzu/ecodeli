'use client';

import { cn } from '@/lib/utils';
import { PublicLayoutProps } from './types';
import { PublicHeader } from './public-header';
import { Footer } from './footer';

/**
 * Layout pour les pages publiques (non authentifiées)
 */
export function PublicLayout({
  children,
  showHeader = true,
  showFooter = true,
  headerProps,
  footerProps,
  className
}: PublicLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      {/* Header */}
      {showHeader && <PublicHeader {...headerProps} />}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      {showFooter && <Footer variant="public" {...footerProps} />}
    </div>
  );
} 