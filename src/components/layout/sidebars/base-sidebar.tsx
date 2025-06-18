"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Bell, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/common";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/auth/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface NavigationItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavigationItem[];
  onClick?: () => void;
}

export interface SidebarSection {
  title?: string;
  items: NavigationItem[];
}

interface BaseSidebarProps {
  locale: string;
  sections: SidebarSection[];
  logo?: React.ReactNode;
  title: string;
  userInfo?: {
    name: string;
    email: string;
    avatar?: string;
  };
  footerActions?: React.ReactNode;
  quickAction?: {
    label: string;
    icon: React.ElementType;
    href: string;
  };
  subscriptionInfo?: {
    plan: string;
    href: string;
  };
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  notifications?: number;
}

export function BaseSidebar({
  locale,
  sections,
  logo,
  title,
  userInfo,
  footerActions,
  quickAction,
  subscriptionInfo,
  className,
  collapsible = true,
  defaultCollapsed = false,
  notifications = 0}: BaseSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mounted, setMounted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  // Effet pour gérer le montage côté client et empêcher les problèmes d'hydratation
  useEffect(() => {
    setMounted(true);
    setWindowWidth(window.innerWidth);
    if (window.innerWidth < 1024) {
      setCollapsed(false);
    }
  }, []);

  // Effet pour gérer les changements de taille d'écran (après montage)
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 1024) {
        setCollapsed(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted]);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout();
  };

  // Fonction pour déterminer si un lien est actif
  const isActive = (href: string) => {
    if (href === `/${locale}`) return pathname === href;
    return pathname.startsWith(href);
  };

  const defaultLogo = (
    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
      <span className="text-primary-foreground font-bold">E</span>
    </div>
  );

  return (
    <nav
      className={cn(
        "h-full flex flex-col bg-background border-r transition-all duration-300",
        collapsed ? "w-[80px]" : "w-[280px]",
        className,
      )}
    >
      {/* En-tête de la Sidebar */}
      <div className="p-4 border-b flex justify-between items-center">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          {logo || defaultLogo}
          {!collapsed && <span className="font-bold truncate">{title}</span>}
        </Link>

        <div className="flex items-center gap-2">
          {!collapsed && notifications > 0 && mounted && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Notifications"
              className="relative"
              asChild
            >
              <Link href={`/${locale}/notifications`}>
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  {notifications > 9 ? "9+" : notifications}
                </span>
              </Link>
            </Button>
          )}

          {/* Afficher le bouton de collapse uniquement côté client après montage */}
          {mounted && collapsible && windowWidth >= 1024 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Déplier" : "Replier"}
              onClick={toggleCollapse}
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  collapsed && "rotate-180",
                )}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Zone principale de navigation (scrollable) */}
      <ScrollArea className="flex-1 overflow-auto py-2">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            {!collapsed && section.title && (
              <h3 className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  href={item.href}
                  passHref
                  onClick={item.onClick}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      collapsed
                        ? "px-0 py-2 h-12 flex-col justify-center"
                        : "px-3 py-2",
                      isActive(item.href) && "bg-muted font-medium",
                    )}
                  >
                    <item.icon
                      className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                    {collapsed && item.badge && (
                      <span className="mt-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Zone d'informations d'abonnement */}
      {!collapsed && subscriptionInfo && mounted && (
        <div className="px-4 py-3 border-t border-b">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Abonnement</span>
              <div className="text-xs text-muted-foreground mt-1">
                {subscriptionInfo.plan}
              </div>
            </div>
            <Link href={subscriptionInfo.href}>
              <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                Gérer
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Action rapide */}
      {!collapsed && quickAction && mounted && (
        <div className="p-4">
          <Button className="w-full" size="sm" asChild>
            <Link href={quickAction.href}>
              <quickAction.icon className="h-4 w-4 mr-2" />
              {quickAction.label}
            </Link>
          </Button>
        </div>
      )}

      {/* Pied de la Sidebar avec profil utilisateur et déconnexion */}
      <div className={cn("border-t", collapsed ? "p-2" : "p-4")}>
        {userInfo && (
          <>
            <div
              className={cn(
                "flex items-center gap-3 mb-4",
                collapsed && "flex-col",
              )}
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {userInfo.avatar ? (
                  <img
                    src={userInfo.avatar}
                    alt={userInfo.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-medium text-sm">
                    {userInfo.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {userInfo.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userInfo.email}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && <Separator className="my-4" />}
          </>
        )}

        {!collapsed && footerActions}

        <Button
          variant="outline"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "text-muted-foreground",
            collapsed ? "w-full h-10 px-0" : "w-full justify-start",
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", collapsed ? "mx-auto" : "mr-2")} />
          {!collapsed && "Déconnexion"}
        </Button>
      </div>
    </nav>
  );
}
