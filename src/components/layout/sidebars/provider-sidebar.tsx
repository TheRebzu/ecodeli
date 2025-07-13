"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Wrench,
  Calendar,
  BookOpen,
  DollarSign,
  FileText,
  Star,
  Settings,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  Home,
  Clock,
  Wallet,
  TrendingUp,
  CheckCircle,
  Award,
  BarChart3,
} from "lucide-react";

interface ProviderSidebarProps {
  collapsed: boolean;
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
}

interface NavigationItem {
  label: string;
  href: string;
  icon: any;
  badge?: number;
  submenu?: NavigationItem[];
}

export function ProviderSidebar({ collapsed, user }: ProviderSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((item) => item !== href)
        : [...prev, href],
    );
  };

  const navigationItems: NavigationItem[] = [
    {
      label: "Tableau de bord",
      href: "/provider",
      icon: Home,
    },
    {
      label: "Réservations",
      href: "/provider/bookings",
      icon: Calendar,
      badge: 5,
      submenu: [
        {
          label: "À venir",
          href: "/provider/bookings/upcoming",
          icon: Clock,
        },
        {
          label: "Historique",
          href: "/provider/bookings/history",
          icon: FileText,
        },
      ],
    },
    {
      label: "Services",
      href: "/provider/services",
      icon: Wrench,
      submenu: [
        {
          label: "Mes services",
          href: "/provider/services/list",
          icon: BookOpen,
        },
        {
          label: "Demandes de services",
          href: "/provider/service-requests",
          icon: BookOpen,
        },
        {
          label: "Mes interventions",
          href: "/provider/interventions",
          icon: CheckCircle,
        },
        {
          label: "Tarifs",
          href: "/provider/services/rates",
          icon: DollarSign,
        },
      ],
    },
    {
      label: "Calendrier",
      href: "/provider/calendar",
      icon: Calendar,
    },
    {
      label: "Gains",
      href: "/provider/earnings",
      icon: Wallet,
      submenu: [
        {
          label: "Résumé",
          href: "/provider/earnings/summary",
          icon: BarChart3,
        },
        {
          label: "Transactions",
          href: "/provider/earnings/transactions",
          icon: DollarSign,
        },
        {
          label: "Retraits",
          href: "/provider/earnings/withdrawals",
          icon: TrendingUp,
        },
      ],
    },
    {
      label: "Facturation",
      href: "/provider/billing",
      icon: FileText,
      submenu: [
        {
          label: "Mensuelle",
          href: "/provider/billing/monthly",
          icon: Calendar,
        },
        {
          label: "Archives",
          href: "/provider/billing/archives",
          icon: FileText,
        },
      ],
    },
    {
      label: "Évaluations",
      href: "/provider/evaluations",
      icon: Star,
    },
    {
      label: "Profil",
      href: "/provider/profile",
      icon: User,
      submenu: [
        {
          label: "Informations",
          href: "/provider/profile/info",
          icon: User,
        },
        {
          label: "Documents",
          href: "/provider/profile/documents",
          icon: FileText,
        },
        {
          label: "Certifications",
          href: "/provider/profile/certifications",
          icon: Award,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/provider") {
      return pathname === "/provider";
    }
    return pathname.startsWith(href);
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const active = isActive(item.href);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedItems.includes(item.href);

    return (
      <div key={item.href}>
        <div className={cn("group relative", level > 0 && "ml-6")}>
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
              active && "bg-accent text-accent-foreground",
              collapsed && "justify-center px-2",
            )}
            onClick={
              hasSubmenu
                ? (e) => {
                    e.preventDefault();
                    toggleExpanded(item.href);
                  }
                : undefined
            }
          >
            <item.icon
              className={cn("h-4 w-4", active && "text-accent-foreground")}
            />

            {!collapsed && (
              <>
                <span className="truncate">{item.label}</span>

                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}

                {hasSubmenu && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExpanded(item.href);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            )}
          </Link>

          {/* Submenu */}
          {hasSubmenu && !collapsed && isExpanded && (
            <div className="mt-1 ml-6 space-y-1">
              {item.submenu!.map((subItem) =>
                renderNavigationItem(subItem, level + 1),
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col border-r bg-background dark:bg-background">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-green-600 dark:text-green-400" />
            <span className="text-lg font-semibold text-green-800 dark:text-green-200">
              EcoDeli
            </span>
          </div>
        ) : (
          <Wrench className="h-6 w-6 text-green-600 dark:text-green-400" />
        )}
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <User className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Prestataire
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map((item) => renderNavigationItem(item))}
      </nav>

      {/* Footer with theme toggle */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Paramètres</span>
            </div>
            <ThemeToggle variant="minimal" />
          </div>
        </div>
      )}
    </div>
  );
}
