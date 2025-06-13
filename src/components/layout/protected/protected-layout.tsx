"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { RoleBasedSidebar } from "@/components/layout/protected/role-based-sidebar";
import { ProtectedHeader } from "@/components/layout/protected/header";
import { ProtectedFooter } from "@/components/layout/protected/footer";
import { PageHeader } from "@/components/layout/protected/page-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Spinner } from "@/components/ui/spinner";
import { AuthGuard } from "@/components/auth/guards/auth-guard";

interface ProtectedLayoutProps {
  children: ReactNode;
  locale: string;
  title?: string;
  description?: string;
  breadcrumb?: Array<{
    label: string;
    href?: string;
  }>;
  actions?: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showSidebar?: boolean;
  showPageHeader?: boolean;
  className?: string;
}

export function ProtectedLayout({
  children,
  locale,
  title,
  description,
  breadcrumb,
  actions,
  showHeader = true,
  showFooter = true,
  showSidebar = true,
  showPageHeader = true,
  className,
}: ProtectedLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Afficher le spinner pendant le chargement de la session
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar latérale basée sur le rôle */}
        {showSidebar && session?.user && (
          <RoleBasedSidebar
            locale={locale}
            userRole={session.user.role as UserRole}
            user={session.user}
          />
        )}

        {/* Contenu principal */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header principal */}
          {showHeader && (
            <ProtectedHeader locale={locale} user={session?.user} />
          )}

          {/* Zone de contenu scrollable */}
          <main className="flex-1 overflow-auto">
            <DashboardShell className={className}>
              {/* En-tête de page avec breadcrumb */}
              {showPageHeader && (title || breadcrumb) && (
                <PageHeader
                  title={title}
                  description={description}
                  breadcrumb={breadcrumb}
                  actions={actions}
                />
              )}

              {/* Contenu de la page */}
              {children}
            </DashboardShell>
          </main>

          {/* Footer minimal */}
          {showFooter && <ProtectedFooter locale={locale} />}
        </div>
      </div>
    </AuthGuard>
  );
}
