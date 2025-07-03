"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  Wrench,
  Calendar,
  DollarSign,
  Star,
  CheckCircle,
  HelpCircle
} from 'lucide-react'

interface ProviderHeaderProps {
  user: {
    id: string
    name?: string
    email: string
    role: string
    avatar?: string
    rating?: number
    isValidated?: boolean
  }
  onSidebarToggle?: () => void
  notifications?: Array<{
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    read: boolean
    createdAt: Date
  }>
}

export function ProviderHeader({ 
  user, 
  onSidebarToggle, 
  notifications = [] 
}: ProviderHeaderProps) {
  const [showSearch, setShowSearch] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const getValidationStatus = () => {
    if (user.isValidated) {
      return (
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-xs text-green-600">Validé</span>
        </div>
      )
    }
    return (
      <div className="flex items-center space-x-1">
        <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
        <span className="text-xs text-orange-600">En attente</span>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-background/95">
      <div className="container flex h-16 items-center">
        {/* Menu mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onSidebarToggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        {/* Logo (visible sur mobile uniquement) */}
        <Link href="/provider" className="flex items-center space-x-2 md:hidden ml-2">
          <Wrench className="h-6 w-6 text-green-600 dark:text-green-400" />
          <span className="font-bold text-xl">EcoDeli</span>
        </Link>

        {/* Barre de recherche */}
        <div className="flex-1 flex items-center justify-center px-4">
          {showSearch ? (
            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher des réservations..."
                  className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  autoFocus
                  onBlur={() => setShowSearch(false)}
                />
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="hidden md:flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Rechercher...</span>
            </Button>
          )}
        </div>

        {/* Actions à droite */}
        <div className="flex items-center space-x-2">
          {/* Bouton d'action rapide */}
          <Button size="sm" asChild className="hidden sm:flex">
            <Link href="/provider/calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Planning
            </Link>
          </Button>

          {/* Recherche mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary">{unreadCount} nouvelles</Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Aucune notification
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start space-y-1 p-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">{notification.title}</span>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {notification.createdAt.toLocaleDateString()}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  {notifications.length > 5 && (
                    <DropdownMenuItem asChild>
                      <Link href="/provider/notifications" className="text-center py-2">
                        Voir toutes les notifications
                      </Link>
                    </DropdownMenuItem>
                  )}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name || user.email} />
                  <AvatarFallback>
                    {user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.name || 'Prestataire'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    {getValidationStatus()}
                    {user.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs">{user.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/provider/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Mon profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/provider/earnings">
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>Mes gains</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/provider/evaluations">
                  <Star className="mr-2 h-4 w-4" />
                  <span>Évaluations</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/provider/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/provider/support">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 