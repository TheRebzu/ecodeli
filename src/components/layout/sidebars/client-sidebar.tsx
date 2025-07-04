/**
 * Sidebar spécialisée pour les clients EcoDeli avec navigation simplifiée
 * Intègre le tutoriel de première connexion et les notifications
 */

"use client"

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Home,
  Package,
  Truck,
  Calendar,
  Archive,
  User,
  Bell,
  HelpCircle,
  Settings,
  Crown,
  Star,
  Wallet,
  BookOpen
} from 'lucide-react'

// Types pour la navigation
interface NavigationItem {
  key: string
  label: string
  href: string
  icon: any
  category?: string
  badge?: string | number
  isNew?: boolean
}

interface ClientSidebarProps {
  className?: string
  collapsed?: boolean
  user?: {
    id: string
    name?: string
    email: string
    role: string
    subscription?: 'FREE' | 'STARTER' | 'PREMIUM'
  }
}

// Configuration simplifiée de la navigation
const getClientNavigation = (subscription?: string): NavigationItem[] => [
  // Pages principales
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    href: '/client',
    icon: Home,
    category: 'main'
  },
  {
    key: 'announcements',
    label: 'Mes annonces',
    href: '/client/announcements',
    icon: Package,
    category: 'main'
  },
  {
    key: 'deliveries',
    label: 'Livraisons',
    href: '/client/deliveries',
    icon: Truck,
    category: 'main',
    badge: 2
  },
  {
    key: 'services',
    label: 'Services',
    href: '/client/services',
    icon: Calendar,
    category: 'services'
  },
  {
    key: 'storage',
    label: 'Box de stockage',
    href: '/client/storage',
    icon: Archive,
    category: 'services'
  },
  // Compte et paramètres
  {
    key: 'subscription',
    label: 'Abonnement',
    href: '/client/subscription',
    icon: subscription === 'PREMIUM' ? Crown : subscription === 'STARTER' ? Star : Wallet,
    category: 'account',
    badge: subscription === 'FREE' ? 'Gratuit' : subscription === 'STARTER' ? 'Starter' : 'Premium'
  },
  {
    key: 'profile',
    label: 'Mon profil',
    href: '/client/profile',
    icon: User,
    category: 'account'
  },
  // Aide et support
  {
    key: 'tutorial',
    label: 'Tutoriel',
    href: '/client/tutorial',
    icon: BookOpen,
    category: 'help',
    isNew: true
  },
  {
    key: 'notifications',
    label: 'Notifications',
    href: '/client/notifications',
    icon: Bell,
    category: 'help',
    badge: 5
  },
  {
    key: 'support',
    label: 'Support',
    href: '/client/support',
    icon: HelpCircle,
    category: 'help'
  }
]

// Catégories de navigation
const categories = {
  main: 'Principal',
  services: 'Services',
  account: 'Mon compte',
  help: 'Aide & Support'
}

function NavigationItem({ 
  item, 
  isActive, 
  collapsed
}: {
  item: NavigationItem
  isActive: boolean
  collapsed: boolean
}) {
  const Icon = item.icon

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-10 px-3 relative",
        isActive && "bg-accent text-accent-foreground font-medium",
        collapsed && "px-2"
      )}
      asChild
    >
      <Link 
        href={item.href}
        data-tutorial={item.key === 'announcements' ? 'create-announcement' : undefined}
      >
        <Icon className={cn("h-4 w-4", collapsed ? "" : "mr-3")} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {item.badge}
              </Badge>
            )}
            {item.isNew && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Nouveau
              </Badge>
            )}
          </>
        )}
      </Link>
    </Button>
  )
}

export function ClientSidebar({ className, collapsed = false, user }: ClientSidebarProps) {
  const pathname = usePathname()
  
  const navigation = getClientNavigation(user?.subscription)

  const isActive = (href: string) => {
    if (href === '/client') {
      return pathname === '/client'
    }
    return pathname.startsWith(href)
  }

  const groupedNavigation = navigation.reduce((acc, item) => {
    const category = item.category || 'main'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, NavigationItem[]>)

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-background dark:bg-background",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-semibold text-blue-800 dark:text-blue-200">EcoDeli</span>
          </div>
        ) : (
          <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        )}
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Plan {user.subscription || 'FREE'}
              </p>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {Object.entries(groupedNavigation).map(([category, items]) => (
            <div key={category} className="space-y-2">
              {!collapsed && (
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {categories[category as keyof typeof categories]}
                </h4>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavigationItem
                    key={item.key}
                    item={item}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
              {!collapsed && category !== 'help' && <Separator className="my-4" />}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer with theme toggle */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Paramètres</span>
            </div>
            <ThemeToggle variant="minimal" />
          </div>
        </div>
      )}
    </div>
  )
}

export function useClientNavigation(user?: any) {
  return getClientNavigation(user?.subscription)
}