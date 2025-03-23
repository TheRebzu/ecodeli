"use client"

import { 
  AreaChart, 
  Box, 
  ClipboardList, 
  CreditCard, 
  FileText, 
  Home, 
  LayoutDashboard, 
  MessageSquare, 
  Package, 
  Settings, 
  ShieldAlert, 
  Truck, 
  Users, 
  Warehouse,
  MenuIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNav } from "./client-sidebar"

export default function AdminSidebar() {
  const sidebarItems = [
    {
      title: "Vue d'ensemble",
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Utilisateurs",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Livraisons",
      href: "/admin/shipments",
      icon: <Truck className="h-5 w-5" />,
    },
    {
      title: "Annonces",
      href: "/admin/announcements",
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      title: "Produits",
      href: "/admin/products",
      icon: <Package className="h-5 w-5" />,
    },
    {
      title: "Finance",
      href: "/admin/finance",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Entrepôts",
      href: "/admin/warehouses",
      icon: <Warehouse className="h-5 w-5" />,
    },
    {
      title: "Stockage",
      href: "/admin/storage",
      icon: <Box className="h-5 w-5" />,
    },
    {
      title: "Analytiques",
      href: "/admin/analytics",
      icon: <AreaChart className="h-5 w-5" />,
    },
    {
      title: "Rapports",
      href: "/admin/reports",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Messages",
      href: "/admin/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      badge: "5",
    },
    {
      title: "Sécurité",
      href: "/admin/security",
      icon: <ShieldAlert className="h-5 w-5" />,
    },
    {
      title: "Paramètres",
      href: "/admin/settings",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      title: "Retour au site",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
  ]

  return (
    <>
      {/* Sidebar pour desktop */}
      <aside className="hidden md:flex border-r bg-background h-screen w-64 flex-col">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Administration</h2>
          <p className="text-sm text-muted-foreground">Gestion de la plateforme</p>
        </div>
        <ScrollArea className="flex-1 py-2">
          <SidebarNav items={sidebarItems} />
        </ScrollArea>
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
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Administration</h2>
              <p className="text-sm text-muted-foreground">Gestion de la plateforme</p>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)] py-2">
              <SidebarNav items={sidebarItems} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
} 