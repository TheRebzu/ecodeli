/**
 * Layout dashboard unifié pour tous les rôles EcoDeli
 * Utilise le nouveau système de sidebar et header
 */

import { type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { BaseLayout } from "./base-layout";
import { DashboardHeaderBase } from "../headers/base-header";
import { AutoBreadcrumbs } from "@/components/ui/breadcrumbs";
import { ClientSidebar } from "../sidebars/client-sidebar";
import { BaseSidebar } from "../sidebars/base-sidebar";
import { cn } from "@/lib/utils";
import { type DashboardLayoutProps } from "../types/layout.types";

// Composants de sidebar par rôle
const SIDEBAR_COMPONENTS = {
  CLIENT: ClientSidebar,
  DELIVERER: BaseSidebar, // TODO: Créer DelivererSidebar
  MERCHANT: BaseSidebar, // TODO: Créer MerchantSidebar
  PROVIDER: BaseSidebar, // TODO: Créer ProviderSidebar
  ADMIN: BaseSidebar, // TODO: Créer AdminSidebar
};

export function DashboardLayout({
  children,
  user,
  loading,
  error,
  role,
  navigationItems,
  quickActions = [],
  notifications = [],
  sidebarCollapsed,
  onSidebarToggle,
  showBreadcrumbs = true,
  breadcrumbs,
}: DashboardLayoutProps) {
  // Obtenir le composant de sidebar approprié
  const SidebarComponent = SIDEBAR_COMPONENTS[role] || BaseSidebar;

  // Gestion de la déconnexion
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        window.location.href = "/login";
      } else {
        console.error("Erreur lors de la déconnexion");
      }
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const handleUserMenuAction = (action: string) => {
    switch (action) {
      case "logout":
        handleLogout();
        break;
      case "profile":
        window.location.href = "/profile";
        break;
      case "settings":
        window.location.href = "/settings";
        break;
      default:
        console.log("Action non gérée:", action);
    }
  };

  return (
    <BaseLayout
      user={user}
      loading={loading}
      error={error}
      withProvider={false} // Le provider est déjà fourni par le layout principal
    >
      <SidebarProvider
        defaultOpen={!sidebarCollapsed}
        onOpenChange={onSidebarToggle}
      >
        <div className="flex min-h-screen bg-background w-full overflow-x-hidden">
          {/* Sidebar unifiée - gestion responsive par shadcn/ui */}
          <SidebarComponent
            role={role}
            user={user}
            navigationItems={navigationItems || []}
            collapsed={sidebarCollapsed}
            onToggle={onSidebarToggle}
          />

          {/* Contenu principal */}
          <SidebarInset className="flex-1 w-full">
            {/* Header */}
            <DashboardHeaderBase
              user={user}
              notifications={notifications}
              quickActions={quickActions}
              onUserMenuClick={handleUserMenuAction}
              onSidebarToggle={onSidebarToggle}
              sticky={true}
              border={true}
              className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            />

            {/* Zone de contenu */}
            <div className="flex-1 flex flex-col">
              {/* Breadcrumbs */}
              {showBreadcrumbs && (
                <div className="border-b border-border bg-muted/30 hidden sm:block">
                  <div className="container mx-auto px-4 py-2 lg:py-3">
                    <AutoBreadcrumbs />
                  </div>
                </div>
              )}

              {/* Contenu principal */}
              <main className="flex-1 w-full">
                <div className="container mx-auto px-4 py-4 lg:px-6 lg:py-6 max-w-7xl">
                  {children}
                </div>
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </BaseLayout>
  );
}

/**
 * Layout dashboard simplifié sans sidebar (pour certaines pages)
 */
export function SimpleDashboardLayout({
  children,
  user,
  loading,
  error,
  title,
  description,
  actions,
  showBackButton = false,
  backHref = "..",
}: {
  children: ReactNode;
  user?: any;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
  backHref?: string;
}) {
  const handleUserMenuAction = (action: string) => {
    if (action === "logout") {
      // Gestion de la déconnexion
      window.location.href = "/login";
    }
  };

  return (
    <BaseLayout
      user={user}
      loading={loading}
      error={error}
      withProvider={false}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="min-h-screen flex flex-col">
        {/* Header simple */}
        <header className="bg-background border-b border-border sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {showBackButton && (
                  <button
                    onClick={() => window.history.back()}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    ← Retour
                  </button>
                )}
                <div>
                  {title && (
                    <h1 className="text-2xl font-bold text-foreground">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-muted-foreground">{description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {actions}
                {user && (
                  <div className="text-sm text-muted-foreground">
                    {user.name || user.email}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
      </div>
    </BaseLayout>
  );
}

/**
 * Layout dashboard avec onglets
 */
export function TabbedDashboardLayout({
  children,
  tabs,
  activeTab,
  onTabChange,
  ...props
}: DashboardLayoutProps & {
  tabs: Array<{ key: string; label: string; href?: string }>;
  activeTab: string;
  onTabChange?: (tabKey: string) => void;
}) {
  return (
    <DashboardLayout {...props}>
      {/* Onglets */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8" aria-label="Onglets">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.href) {
                  window.location.href = tab.href;
                } else if (onTabChange) {
                  onTabChange(tab.key);
                }
              }}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {children}
    </DashboardLayout>
  );
}

/**
 * Hook pour obtenir la configuration dashboard par rôle
 */
export function useDashboardConfig(role: string) {
  const configs = {
    CLIENT: {
      title: "Espace Client",
      description: "Gérez vos annonces et services",
      quickActions: [
        {
          key: "new-announcement",
          label: "Nouvelle annonce",
          icon: "Plus",
          href: "/client/announcements/create",
        },
        {
          key: "track-delivery",
          label: "Suivi livraison",
          icon: "MapPin",
          href: "/client/tracking",
        },
      ],
    },
    DELIVERER: {
      title: "Espace Livreur",
      description: "Gérez vos livraisons et planning",
      quickActions: [
        {
          key: "declare-trip",
          label: "Déclarer un trajet",
          icon: "Plus",
          href: "/deliverer/trips/create",
        },
        {
          key: "scan-qr",
          label: "Scanner QR",
          icon: "QrCode",
          onClick: () => {},
        },
      ],
    },
    MERCHANT: {
      title: "Espace Commerçant",
      description: "Gérez vos magasins et commandes",
      quickActions: [
        {
          key: "bulk-import",
          label: "Import en lot",
          icon: "Upload",
          href: "/merchant/bulk-import",
        },
        {
          key: "new-announcement",
          label: "Nouvelle annonce",
          icon: "Plus",
          href: "/merchant/announcements/create",
        },
      ],
    },
    PROVIDER: {
      title: "Espace Prestataire",
      description: "Gérez vos services et interventions",
      quickActions: [
        {
          key: "availability",
          label: "Disponibilités",
          icon: "Calendar",
          href: "/provider/availability",
        },
        {
          key: "new-service",
          label: "Nouveau service",
          icon: "Plus",
          href: "/provider/services/create",
        },
      ],
    },
    ADMIN: {
      title: "Administration",
      description: "Gérez la plateforme EcoDeli",
      quickActions: [
        {
          key: "validations",
          label: "Validations",
          icon: "Shield",
          href: "/admin/validations",
        },
        {
          key: "monitoring",
          label: "Monitoring",
          icon: "Activity",
          href: "/admin/monitoring",
        },
      ],
    },
  };

  return configs[role as keyof typeof configs] || configs.CLIENT;
}
