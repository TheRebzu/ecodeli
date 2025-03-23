"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  PackageSearch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Types
interface SidebarNavProps {
  isCollapsed: boolean;
  links: {
    title: string;
    label?: string;
    icon: React.ComponentType<any>;
    variant: "default" | "ghost";
    href: string;
  }[];
}

// Composants de layout
function SidebarNav({ links, isCollapsed }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div
      data-collapsed={isCollapsed}
      className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
    >
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === link.href
                ? "bg-accent text-accent-foreground"
                : "transparent",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <link.icon className="h-4 w-4" />
            {!isCollapsed && (
              <span className="truncate">
                {link.title}
              </span>
            )}
            {!isCollapsed && link.label && (
              <span className="ml-auto text-xs font-semibold">
                {link.label}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function UserButton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
        <div className="hidden md:block">
          <p className="text-sm font-medium">Administrateur</p>
          <p className="text-xs text-muted-foreground">admin@ecodeli.fr</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Déconnexion</span>
      </Button>
    </div>
  );
}

// Layout principal
interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Liens de navigation
  const navLinks = [
    {
      title: "Tableau de bord",
      icon: LayoutDashboard,
      variant: "default" as const,
      href: "/admin/dashboard",
    },
    {
      title: "Utilisateurs",
      icon: Users,
      variant: "ghost" as const,
      href: "/admin/users",
    },
    {
      title: "Commandes",
      icon: ShoppingBag,
      variant: "ghost" as const,
      label: "25",
      href: "/admin/orders",
    },
    {
      title: "Produits",
      icon: PackageSearch,
      variant: "ghost" as const,
      href: "/admin/products",
    },
    {
      title: "Annonces",
      icon: Bell,
      variant: "ghost" as const,
      href: "/admin/announcements",
    },
    {
      title: "Paramètres",
      icon: Settings,
      variant: "ghost" as const,
      href: "/admin/settings",
    },
  ];

  const getPageTitle = () => {
    const currentLink = navLinks.find(link => pathname === link.href);
    return currentLink?.title || "Administration";
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/10">
      {/* Sidebar pour mobile */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="absolute left-4 top-4 z-50 md:hidden">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <div className="flex h-full flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
                </svg>
                <span className="text-lg font-bold">EcoDeli Admin</span>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <SidebarNav links={navLinks} isCollapsed={false} />
            </ScrollArea>
            <div className="p-4 border-t">
              <UserButton />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar pour desktop */}
      <div
        className={cn(
          "hidden md:flex flex-col border-r bg-background",
          isCollapsed ? "md:w-[70px]" : "md:w-[240px]"
        )}
      >
        <div className={cn(
          "flex h-14 items-center border-b px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
              </svg>
              <span className="font-bold">EcoDeli Admin</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isCollapsed ? "Expand" : "Collapse"}
            </span>
          </Button>
        </div>
        <ScrollArea className="flex-1 overflow-auto">
          <SidebarNav links={navLinks} isCollapsed={isCollapsed} />
        </ScrollArea>
        <div className={cn(
          "mt-auto p-4 border-t",
          isCollapsed ? "flex justify-center" : ""
        )}>
          {isCollapsed ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          ) : (
            <UserButton />
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <main className="flex-1 overflow-hidden">
        <div className="hidden md:flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <div className="font-semibold">{getPageTitle()}</div>
          <div className="ml-auto flex items-center gap-2">
            {/* Boutons d'action */}
          </div>
        </div>
        <div className="container pt-4 md:pt-10 pb-12 md:pb-16 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
} 