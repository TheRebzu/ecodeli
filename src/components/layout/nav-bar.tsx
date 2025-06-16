"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils/common";
import { Home, Package, ShoppingBag, MessageSquare, User } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
}

interface NavBarProps {
  locale: string;
  items?: NavItem[];
  role?: "client" | "deliverer" | "merchant" | "provider" | "admin";
  className?: string;
}

export function NavBar({
  locale,
  role = "client",
  className,
  items}: NavBarProps) {
  const pathname = usePathname();

  // Navigation par défaut par rôle
  const defaultNavItems: Record<string, NavItem[]> = {
    client: [
      { label: "Accueil", icon: Home, href: `/${locale}/client` },
      {
        label: "Livraisons",
        icon: Package,
        href: `/${locale}/client/deliveries`},
      {
        label: "Services",
        icon: ShoppingBag,
        href: `/${locale}/client/services`},
      {
        label: "Messages",
        icon: MessageSquare,
        href: `/${locale}/client/messages`,
        badge: 3},
      { label: "Profil", icon: User, href: `/${locale}/client/profile` }],
    deliverer: [
      { label: "Accueil", icon: Home, href: `/${locale}/deliverer` },
      {
        label: "Livraisons",
        icon: Package,
        href: `/${locale}/deliverer/deliveries`},
      {
        label: "Messages",
        icon: MessageSquare,
        href: `/${locale}/deliverer/messages`},
      { label: "Profil", icon: User, href: `/${locale}/deliverer/profile` }],
    merchant: [
      { label: "Accueil", icon: Home, href: `/${locale}/merchant` },
      {
        label: "Annonces",
        icon: ShoppingBag,
        href: `/${locale}/merchant/announcements`},
      {
        label: "Messages",
        icon: MessageSquare,
        href: `/${locale}/merchant/messages`},
      { label: "Profil", icon: User, href: `/${locale}/merchant/profile` }],
    provider: [
      { label: "Accueil", icon: Home, href: `/${locale}/provider` },
      {
        label: "Services",
        icon: ShoppingBag,
        href: `/${locale}/provider/services`},
      {
        label: "Messages",
        icon: MessageSquare,
        href: `/${locale}/provider/messages`},
      { label: "Profil", icon: User, href: `/${locale}/provider/profile` }]};

  const navItems = items || defaultNavItems[role] || defaultNavItems.client;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 bg-background shadow-top border-t h-16 flex md:hidden",
        className,
      )}
    >
      <nav className="flex justify-around items-center w-full px-2">
        {navItems.map((item, index) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0 inset-x-0 mx-auto h-0.5 w-10 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Barre de navigation pour le bas de l'écran en mode mobile
export function MobileNavBar({
  locale,
  role}: {
  locale: string;
  role?: string;
}) {
  return <NavBar locale={locale} role={role as any} />;
}

// Barre de navigation latérale pour les tablettes et ordinateurs
export function DesktopSideNav({
  locale,
  role}: {
  locale: string;
  role?: string;
}) {
  return (
    <div className="hidden md:flex h-full w-16 flex-col border-r bg-background">
      <NavBar
        locale={locale}
        role={role as any}
        className="relative h-full flex-col p-2 flex justify-start items-center space-y-4 border-0 shadow-none pt-4"
      />
    </div>
  );
}
