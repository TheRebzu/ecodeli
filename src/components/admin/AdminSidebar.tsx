"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AreaChart,
  Box,
  ClipboardList,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  TruckIcon,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AdminNavProps {
  isCollapsed?: boolean;
  links: {
    title: string;
    label?: string;
    icon: React.ReactNode;
    variant: "default" | "ghost";
    href: string;
  }[];
}

type DashboardLink = {
  title: string;
  label?: string;
  icon: React.ReactNode;
  variant: "default" | "ghost";
  href: string;
};

export function AdminNav({ links, isCollapsed }: AdminNavProps) {
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
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === link.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground",
              isCollapsed && "h-9 w-9 justify-center p-0"
            )}
          >
            {link.icon}
            {!isCollapsed && <span>{link.title}</span>}
            {!isCollapsed && link.label && (
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                {link.label}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  
  const dashboardLinks: DashboardLink[] = [
    {
      title: "Vue d'ensemble",
      href: "/admin",
      icon: <LayoutDashboard className="h-4 w-4" />,
      variant: pathname === "/admin" ? "default" : "ghost",
    },
    {
      title: "Espace personnel",
      href: "/dashboard?role=admin",
      icon: <Home className="h-4 w-4" />,
      variant: pathname === "/dashboard" && pathname.includes("role=admin") ? "default" : "ghost",
    },
    {
      title: "Utilisateurs",
      href: "/admin/users",
      icon: <Users className="h-4 w-4" />,
      variant: pathname.includes("/admin/users") ? "default" : "ghost",
    },
    {
      title: "Livraisons",
      href: "/admin/shipments",
      icon: <TruckIcon className="h-4 w-4" />,
      variant: pathname.includes("/admin/shipments") ? "default" : "ghost",
    },
    {
      title: "Produits",
      href: "/admin/products",
      icon: <Package className="h-4 w-4" />,
      variant: pathname.includes("/admin/products") ? "default" : "ghost",
      label: "Nouveau",
    },
    {
      title: "Commandes",
      href: "/admin/orders",
      icon: <ClipboardList className="h-4 w-4" />,
      variant: pathname.includes("/admin/orders") ? "default" : "ghost",
    },
    {
      title: "Finances",
      href: "/admin/finances",
      icon: <Wallet className="h-4 w-4" />,
      variant: pathname.includes("/admin/finances") ? "default" : "ghost", 
    },
    {
      title: "Entrepôts",
      href: "/admin/storage",
      icon: <Box className="h-4 w-4" />,
      variant: pathname.includes("/admin/storage") ? "default" : "ghost",
    },
    {
      title: "Analytiques",
      href: "/admin/analytics",
      icon: <AreaChart className="h-4 w-4" />,
      variant: pathname.includes("/admin/analytics") ? "default" : "ghost",
      label: "Pro",
    },
    {
      title: "Rapports",
      href: "/admin/reports",
      icon: <FileText className="h-4 w-4" />,
      variant: pathname.includes("/admin/reports") ? "default" : "ghost",
    },
    {
      title: "Messages",
      href: "/admin/messages",
      icon: <MessageSquare className="h-4 w-4" />,
      variant: pathname.includes("/admin/messages") ? "default" : "ghost",
    },
    {
      title: "Support",
      href: "/admin/support",
      icon: <HelpCircle className="h-4 w-4" />,
      variant: pathname.includes("/admin/support") ? "default" : "ghost",
    },
    {
      title: "Paramètres",
      href: "/admin/settings",
      icon: <Settings className="h-4 w-4" />,
      variant: pathname.includes("/admin/settings") ? "default" : "ghost",
    },
    {
      title: "Retour au site",
      href: "/",
      icon: <Home className="h-4 w-4" />,
      variant: "ghost",
    },
  ];

  return (
    <>
      {/* Sidebar pour desktop */}
      <aside className="hidden md:flex border-r bg-background h-screen w-64 flex-col">
        <div className="border-b px-4 py-4">
          <h2 className="text-lg font-semibold">Administration</h2>
          <p className="text-sm text-muted-foreground">Gestion de la plateforme</p>
        </div>
        <ScrollArea className="flex-1 py-2">
          <AdminNav links={dashboardLinks} />
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full h-8 w-8 bg-primary text-white flex items-center justify-center text-sm font-medium">
              A
            </div>
            <div>
              <p className="text-sm font-medium">Admin EcoDeli</p>
              <p className="text-xs text-muted-foreground">admin@ecodeli.fr</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar pour mobile (sheet) */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="border-b px-4 py-4">
              <h2 className="text-lg font-semibold">Administration</h2>
              <p className="text-sm text-muted-foreground">Gestion de la plateforme</p>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)] py-2">
              <AdminNav links={dashboardLinks} />
            </ScrollArea>
            <div className="border-t p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full h-8 w-8 bg-primary text-white flex items-center justify-center text-sm font-medium">
                  A
                </div>
                <div>
                  <p className="text-sm font-medium">Admin EcoDeli</p>
                  <p className="text-xs text-muted-foreground">admin@ecodeli.fr</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
} 