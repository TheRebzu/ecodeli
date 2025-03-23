"use client"

import { 
  Archive, 
  BarChart3, 
  CreditCard, 
  FileText, 
  Home, 
  LayoutDashboard, 
  MessageSquare, 
  Package, 
  ScrollText, 
  Settings, 
  ShoppingBag, 
  Store, 
  TruckIcon, 
  UserCircle,
  MenuIcon,
  ClipboardCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNav } from "./client-sidebar"

export default function MerchantSidebar() {
  const sidebarItems = [
    {
      title: "Tableau de bord",
      href: "/dashboard/merchant",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Ma boutique",
      href: "/dashboard/merchant/store",
      icon: <Store className="h-5 w-5" />,
    },
    {
      title: "Produits",
      href: "/dashboard/merchant/products",
      icon: <Package className="h-5 w-5" />,
    },
    {
      title: "Commandes clients",
      href: "/dashboard/merchant/orders",
      icon: <ShoppingBag className="h-5 w-5" />,
      badge: "2",
    },
    {
      title: "Livraisons",
      href: "/dashboard/merchant/shipments",
      icon: <TruckIcon className="h-5 w-5" />,
    },
    {
      title: "Contrats & Abonnements",
      href: "/dashboard/merchant/contracts",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      title: "Facturation",
      href: "/dashboard/merchant/invoices",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Statistiques",
      href: "/dashboard/merchant/statistics",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Inventaire",
      href: "/dashboard/merchant/inventory",
      icon: <Archive className="h-5 w-5" />,
    },
    {
      title: "Transactions",
      href: "/dashboard/merchant/transactions",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Documents",
      href: "/dashboard/merchant/documents",
      icon: <ScrollText className="h-5 w-5" />,
    },
    {
      title: "Messages",
      href: "/dashboard/merchant/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      badge: "3",
    },
    {
      title: "Profil",
      href: "/dashboard/merchant/profile",
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      title: "Paramètres",
      href: "/dashboard/merchant/settings",
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
          <h2 className="text-lg font-semibold">Espace Commerçant</h2>
          <p className="text-sm text-muted-foreground">Gestion de votre activité</p>
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
              <h2 className="text-lg font-semibold">Espace Commerçant</h2>
              <p className="text-sm text-muted-foreground">Gestion de votre activité</p>
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