"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  User,
  Package,
  ShoppingBag, 
  Truck, 
  Settings, 
  LogOut, 
  Heart,
  Map,
  BarChart,
  CalendarClock,
  MessageSquare,
  Users,
  Building,
  PanelRight,
  LucideIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

type ProfileMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type ProfileMenuGroup = {
  items: ProfileMenuItem[];
};

const roleNavItems: Record<string, ProfileMenuGroup> = {
  CLIENT: {
    items: [
      { label: "Profil", href: "/dashboard/profile", icon: User },
      { label: "Mes livraisons", href: "/dashboard/deliveries", icon: Package },
      { label: "Mes favoris", href: "/dashboard/favorites", icon: Heart },
      { label: "Mes messages", href: "/dashboard/messages", icon: MessageSquare },
      { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
    ],
  },
  MERCHANT: {
    items: [
      { label: "Profil", href: "/dashboard/profile", icon: User },
      { label: "Tableau de bord", href: "/dashboard", icon: BarChart },
      { label: "Mes commandes", href: "/dashboard/orders", icon: ShoppingBag },
      { label: "Mes livraisons", href: "/dashboard/deliveries", icon: Truck },
      { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
    ],
  },
  COURIER: {
    items: [
      { label: "Profil", href: "/dashboard/profile", icon: User },
      { label: "Mes missions", href: "/dashboard/missions", icon: Map },
      { label: "Mon planning", href: "/dashboard/schedule", icon: CalendarClock },
      { label: "Mes revenus", href: "/dashboard/earnings", icon: BarChart },
      { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
    ],
  },
  PROVIDER: {
    items: [
      { label: "Profil", href: "/dashboard/profile", icon: User },
      { label: "Mes services", href: "/dashboard/services", icon: Users },
      { label: "Mes clients", href: "/dashboard/clients", icon: Building },
      { label: "Mes revenus", href: "/dashboard/earnings", icon: BarChart },
      { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
    ],
  },
  ADMIN: {
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: BarChart },
      { label: "Administration", href: "/admin", icon: PanelRight },
      { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
    ],
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function ProfileButton() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (status === "loading") {
    return <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />;
  }

  const userRole = session?.user?.role || "CLIENT";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  if (session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0"
          >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              <AvatarImage
                src={session.user?.image || ""}
                alt={session.user?.name || ""}
              />
              <AvatarFallback className="text-xs sm:text-sm">
                {getInitials(session.user?.name || "U")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate max-w-[180px]">
                {session.user?.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate max-w-[180px]">
                {session.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {roleNavItems[userRole].items.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="cursor-pointer w-full">
                  <item.icon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <div className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="text-xs sm:text-sm">Déconnexion...</span>
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Déconnexion</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link href="/login">
        <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3">
          Connexion
        </Button>
      </Link>
      <Link href="/register">
        <Button size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3">S&apos;inscrire</Button>
      </Link>
    </div>
  );
} 