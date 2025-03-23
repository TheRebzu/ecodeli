"use client"

import Link from "next/link"
import { useState } from "react"
import { 
  BellIcon, 
  CalendarIcon, 
  CheckIcon, 
  ChevronDown, 
  LogOut, 
  MessageSquare, 
  PlusIcon, 
  SearchIcon, 
  Settings, 
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Types pour les variantes de header
type DashboardVariant = "client" | "courier" | "merchant" | "provider" | "admin"

// Type pour les actions rapides spécifiques à chaque rôle
type QuickAction = {
  label: string
  href: string
  icon: React.ReactNode
  variant?: "default" | "outline" | "secondary"
}

// Type pour les propriétés du composant
interface DashboardHeaderProps {
  user: {
    name?: string
    email?: string
    role?: string
    image?: string
  }
  variant: DashboardVariant
}

export default function DashboardHeader({ user, variant }: DashboardHeaderProps) {
  const [notifications, setNotifications] = useState<{ id: string; title: string; description: string }[]>([
    { id: "1", title: "Nouvelle commande", description: "Vous avez reçu une nouvelle commande #1234" },
    { id: "2", title: "Message important", description: "Un administrateur vous a envoyé un message" }
  ])
  
  // Définir les actions rapides en fonction du variant
  const getQuickActions = (): QuickAction[] => {
    switch (variant) {
      case "client":
        return [
          { label: "Nouvelle annonce", href: "/dashboard/client/announcements/new", icon: <PlusIcon className="h-4 w-4 mr-2" /> },
          { label: "Suivre un colis", href: "/dashboard/client/packages/track", icon: <SearchIcon className="h-4 w-4 mr-2" /> }
        ]
      case "courier":
        return [
          { label: "Chercher des livraisons", href: "/dashboard/courier/shipments/available", icon: <SearchIcon className="h-4 w-4 mr-2" /> },
          { label: "Ajouter un trajet", href: "/dashboard/courier/routes/new", icon: <PlusIcon className="h-4 w-4 mr-2" /> }
        ]
      case "merchant":
        return [
          { label: "Nouvelle commande", href: "/dashboard/merchant/orders/new", icon: <PlusIcon className="h-4 w-4 mr-2" /> },
          { label: "Ajouter un produit", href: "/dashboard/merchant/products/new", icon: <PlusIcon className="h-4 w-4 mr-2" /> }
        ]
      case "provider":
        return [
          { label: "Ajouter un service", href: "/dashboard/provider/services/new", icon: <PlusIcon className="h-4 w-4 mr-2" /> },
          { label: "Gérer les disponibilités", href: "/dashboard/provider/availability", icon: <CalendarIcon className="h-4 w-4 mr-2" /> }
        ]
      case "admin":
        return [
          { label: "Ajouter un utilisateur", href: "/admin/users/new", icon: <PlusIcon className="h-4 w-4 mr-2" /> },
          { label: "Configurations", href: "/admin/settings", icon: <Settings className="h-4 w-4 mr-2" />, variant: "outline" }
        ]
      default:
        return []
    }
  }
  
  // Marquer une notification comme lue
  const markAsRead = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  // Gérer la déconnexion avec un lien direct
  const handleLogout = () => {
    // Redirection vers la route de déconnexion
    window.location.href = "/api/auth/signout"
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      {/* Barre de recherche */}
      <div className="relative hidden md:flex flex-1 mx-4 lg:mx-8">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={`Rechercher dans ${variant === "admin" ? "l'administration" : "votre espace"}`}
          className="w-full max-w-md pl-8"
        />
      </div>
      
      {/* Actions rapides */}
      <div className="flex items-center ml-auto gap-2">
        {getQuickActions().map((action, index) => (
          <Button 
            key={index} 
            variant={action.variant || "default"} 
            size="sm" 
            className="hidden sm:flex"
            asChild
          >
            <Link href={action.href}>
              {action.icon}
              {action.label}
            </Link>
          </Button>
        ))}
        
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <BellIcon className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-4 pb-2 border-b">
              <div className="font-medium">Notifications</div>
              <div className="text-xs text-muted-foreground mt-1">
                {notifications.length === 0 
                  ? "Vous n'avez pas de nouvelles notifications" 
                  : `Vous avez ${notifications.length} notifications non lues`
                }
              </div>
            </div>
            {notifications.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 border-b last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{notification.description}</div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckIcon className="h-4 w-4" />
                        <span className="sr-only">Marquer comme lu</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Toutes vos notifications ont été lues
              </div>
            )}
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                <Link href={`/dashboard/${variant}/notifications`}>
                  Voir toutes les notifications
                </Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Messages */}
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/${variant}/messages`}>
            <MessageSquare className="h-5 w-5" />
            <span className="sr-only">Messages</span>
          </Link>
        </Button>
        
        {/* Profil utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-2 gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.image || `https://avatar.vercel.sh/${user.email}`} alt={user.name || ""} />
                <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block">
                {user.name || user.email}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/${variant}/profile`}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/${variant}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
} 