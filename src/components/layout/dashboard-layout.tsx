'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DashboardLayoutProps } from './types';
import { AdminHeader } from './admin-header';
import { ClientHeader } from './client-header';
import { DelivererHeader } from './deliverer-header';
import { MerchantHeader } from './merchant-header';
import { ProviderHeader } from './provider-header';
import { Footer } from './footer';
import { Sidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

/**
 * Layout principal pour les espaces utilisateur (dashboard)
 */
export function DashboardLayout({
  children,
  user,
  header,
  sidebar,
  className
}: DashboardLayoutProps) {
  const { logout } = useAuth();

  // Sélection du header approprié selon le rôle
  const getHeaderByRole = () => {
    if (header) return header;

    const baseProps = {
      user,
      onLogout: logout
    };

    switch (user.role) {
      case 'ADMIN':
        return <AdminHeader {...baseProps} />;
      case 'CLIENT':
        return <ClientHeader {...baseProps} />;
      case 'DELIVERER':
        return <DelivererHeader {...baseProps} />;
      case 'MERCHANT':
        return <MerchantHeader {...baseProps} />;
      case 'PROVIDER':
        return <ProviderHeader {...baseProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      {getHeaderByRole()}

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-64 border-r bg-muted/40 overflow-y-auto">
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer variant="dashboard" />
    </div>
  );
} 