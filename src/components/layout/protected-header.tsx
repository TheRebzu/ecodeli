"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { MainHeader } from "@/components/layout/protected/header";
import { AdminSidebar } from "@/components/layout/sidebars/admin-sidebar";
import { ClientSidebar } from "@/components/layout/sidebars/client-sidebar";
import { DelivererSidebar } from "@/components/layout/sidebars/deliverer-sidebar";
import { MerchantSidebar } from "@/components/layout/sidebars/merchant-sidebar";
import { ProviderSidebar } from "@/components/layout/sidebars/provider-sidebar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/auth/use-auth";

interface ProtectedHeaderProps {
  locale?: string;
  showSearch?: boolean;
  notificationCount?: number;
  messageCount?: number;
}

export function ProtectedHeader({
  locale = "fr",
  showSearch = true,
  notificationCount = 3,
  messageCount = 2,
}: ProtectedHeaderProps) {
  const [searchValue, setSearchValue] = useState("");
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Détermine le rôle actuel à partir du pathname
  const getRoleFromPath = () => {
    if (pathname.includes("/admin")) return "admin";
    if (pathname.includes("/client")) return "client";
    if (pathname.includes("/deliverer")) return "deliverer";
    if (pathname.includes("/merchant")) return "merchant";
    if (pathname.includes("/provider")) return "provider";
    return "client";
  };

  const role = getRoleFromPath();

  // Obtient le composant de sidebar approprié en fonction du rôle
  const getSidebarComponent = () => {
    switch (role) {
      case "admin":
        return <AdminSidebar locale={locale} />;
      case "client":
        return <ClientSidebar locale={locale} />;
      case "deliverer":
        return <DelivererSidebar locale={locale} />;
      case "merchant":
        return <MerchantSidebar locale={locale} />;
      case "provider":
        return <ProviderSidebar locale={locale} />;
      default:
        return <ClientSidebar locale={locale} />;
    }
  };

  // Traduit le nom du rôle
  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return "Administration";
      case "client":
        return "Espace Client";
      case "deliverer":
        return "Espace Livreur";
      case "merchant":
        return "Espace Commerçant";
      case "provider":
        return "Espace Prestataire";
      default:
        return "Espace Personnel";
    }
  };

  // Pour la recherche
  const handleSearch = (searchTerm: string) => {
    console.log("Recherche:", searchTerm);
    // Implémenter la logique de recherche
  };

  return (
    <MainHeader
      locale={locale}
      title="EcoDeli"
      subtitle={getRoleLabel()}
      sidebarComponent={getSidebarComponent()}
      showSearch={showSearch}
      notificationCount={notificationCount}
      messageCount={messageCount}
      logoHref={`/${locale}/${role}`}
      onSearch={handleSearch}
      userMenuItems={
        role === "admin" && (
          <Badge
            variant="outline"
            className="flex items-center gap-1 ml-2 py-1 border-orange-400/30 text-orange-500 bg-orange-50 dark:bg-orange-900/20"
          >
            <Shield className="h-3 w-3 mr-1" />
            <span className="text-xs">Super Admin</span>
          </Badge>
        )
      }
    />
  );
}
