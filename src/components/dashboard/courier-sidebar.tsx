"use client"

import { 
  Calendar, 
  CreditCard, 
  FileText, 
  Home, 
  LayoutDashboard, 
  MapPin, 
  MessageSquare, 
  PackageSearch, 
  Route, 
  Settings, 
  TruckIcon, 
  UserCircle,
  MenuIcon,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNav } from "./client-sidebar"

export default function CourierSidebar() {
  const sidebarItems = [
    {
      title: "Tableau de bord",
      href: "/dashboard/courier",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Annonces disponibles",
      href: "/dashboard/courier/announcements",
      icon: <PackageSearch className="h-5 w-5" />,
      badge: "Nouveau",
    },
    {
      title: "Mes livraisons",
      href: "/dashboard/courier/shipments",
      icon: <TruckIcon className="h-5 w-5" />,
    },
    {
      title: "Mes trajets planifiés",
      href: "/dashboard/courier/routes",
      icon: <Route className="h-5 w-5" />,
    },
    {
      title: "Historique des trajets",
      href: "/dashboard/courier/routes/history",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      title: "Mon portefeuille",
      href: "/dashboard/courier/wallet",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Mes documents",
      href: "/dashboard/courier/documents",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Mes points de dépôt",
      href: "/dashboard/courier/droppoints",
      icon: <MapPin className="h-5 w-5" />,
    },
    {
      title: "Disponibilités",
      href: "/dashboard/courier/availability",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Messages",
      href: "/dashboard/courier/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      badge: "2",
    },
    {
      title: "Profil",
      href: "/dashboard/courier/profile",
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      title: "Paramètres",
      href: "/dashboard/courier/settings",
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
          <h2 className="text-lg font-semibold">Espace Livreur</h2>
          <p className="text-sm text-muted-foreground">Gestion de vos livraisons</p>
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
              <h2 className="text-lg font-semibold">Espace Livreur</h2>
              <p className="text-sm text-muted-foreground">Gestion de vos livraisons</p>
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