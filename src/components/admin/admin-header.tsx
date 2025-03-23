"use client"

import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { 
  Bell, 
  CalendarIcon, 
  CheckIcon, 
  ChevronDown, 
  LogOut, 
  MessageSquare, 
  PlusIcon, 
  Search,
  Settings,
  Users,
  Sun,
  Moon
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
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"

export function AdminHeader() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [unreadNotifications, setUnreadNotifications] = useState(3)
  
  const handleSignOut = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center relative max-w-md w-full">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => setUnreadNotifications(0)}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <Badge 
                  className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center" 
                  variant="destructive"
                >
                  {unreadNotifications}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="border-b px-4 py-3">
              <h4 className="text-sm font-medium">Notifications</h4>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>AC</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nouvelle commande urgente</p>
                  <p className="text-xs text-muted-foreground">Il y a 5 minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>SY</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nouveau commerçant en attente</p>
                  <p className="text-xs text-muted-foreground">Il y a 30 minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Problème de paiement détecté</p>
                  <p className="text-xs text-muted-foreground">Il y a 1 heure</p>
                </div>
              </div>
            </div>
            <div className="border-t p-2">
              <Button variant="ghost" className="w-full justify-center" asChild>
                <Link href="/admin/notifications">Voir toutes les notifications</Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/messages">
            <MessageSquare className="h-5 w-5" />
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || ""} alt={user?.name || "Admin"} />
                <AvatarFallback>{user?.name?.charAt(0) || "A"}</AvatarFallback>
              </Avatar>
              <div className="hidden items-center gap-1 md:flex">
                <span>{user?.name || "Admin"}</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings/profile">
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Gestion des utilisateurs
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
} 