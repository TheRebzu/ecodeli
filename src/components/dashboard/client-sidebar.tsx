"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  BoxIcon, 
  ClipboardList, 
  CreditCard, 
  HeartHandshake, 
  Home, 
  LayoutDashboard, 
  MessageSquare, 
  PackageOpen, 
  Settings, 
  TruckIcon, 
  UserCircle,
  MenuIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface SidebarNavProps {
  items: {
    title: string
    href: string
    icon: React.ReactNode
    badge?: string
  }[]
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="grid gap-1 px-2 py-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
            pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          {item.icon}
          <span>{item.title}</span>
          {item.badge && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

export default function ClientSidebar() {
  const sidebarItems = [
    {
      title: "Tableau de bord",
      href: "/dashboard/client",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Mes annonces",
      href: "/dashboard/client/announcements",
      icon: <ClipboardList className="h-5 w-5" />,
      badge: "Nouveau",
    },
    {
      title: "Mes livraisons",
      href: "/dashboard/client/shipments",
      icon: <TruckIcon className="h-5 w-5" />,
    },
    {
      title: "Services",
      href: "/dashboard/client/services",
      icon: <HeartHandshake className="h-5 w-5" />,
    },
    {
      title: "Portefeuille",
      href: "/dashboard/client/wallet",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Stockage",
      href: "/dashboard/client/storage",
      icon: <BoxIcon className="h-5 w-5" />,
    },
    {
      title: "Colis",
      href: "/dashboard/client/packages",
      icon: <PackageOpen className="h-5 w-5" />,
    },
    {
      title: "Messages",
      href: "/dashboard/client/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      badge: "3",
    },
    {
      title: "Profil",
      href: "/dashboard/client/profile",
      icon: <UserCircle className="h-5 w-5" />,
    },
    {
      title: "Paramètres",
      href: "/dashboard/client/settings",
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
          <h2 className="text-lg font-semibold">Espace Client</h2>
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
              <h2 className="text-lg font-semibold">Espace Client</h2>
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