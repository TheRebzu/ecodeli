"use client"

import { 
  Award, 
  Calendar, 
  CreditCard, 
  FileText, 
  Heart, 
  Home, 
  LayoutDashboard, 
  MessageSquare, 
  PackageOpen, 
  Settings, 
  Star, 
  UserCircle,
  MenuIcon,
  ClipboardCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNav } from "./client-sidebar"

export default function ProviderSidebar() {
  const sidebarItems = [
    {
      title: "Tableau de bord",
      href: "/dashboard/provider",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Mes services",
      href: "/dashboard/provider/services",
      icon: <Heart className="h-5 w-5" />,
    },
    {
      title: "Demandes de services",
      href: "/dashboard/provider/requests",
      icon: <ClipboardCheck className="h-5 w-5" />,
      badge: "Nouveau",
    },
    {
      title: "Planning",
      href: "/dashboard/provider/planning",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: "Mon portefeuille",
      href: "/dashboard/provider/wallet",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Facturation",
      href: "/dashboard/provider/invoices",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Stockage",
      href: "/dashboard/provider/storage",
      icon: <PackageOpen className="h-5 w-5" />,
    },
    {
      title: "Évaluations",
      href: "/dashboard/provider/ratings",
      icon: <Star className="h-5 w-5" />,
    },
    {
      title: "Certifications",
      href: "/dashboard/provider/certifications",
      icon: <Award className="h-5 w-5" />,
    },
    {
      title: "Messages",
      href: "/dashboard/provider/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      badge: "1",
    },
    {
      title: "Profil",
      href: "/dashboard/provider/profile",
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      title: "Paramètres",
      href: "/dashboard/provider/settings",
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
          <h2 className="text-lg font-semibold">Espace Prestataire</h2>
          <p className="text-sm text-muted-foreground">Gestion de vos services</p>
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
              <h2 className="text-lg font-semibold">Espace Prestataire</h2>
              <p className="text-sm text-muted-foreground">Gestion de vos services</p>
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