/**
 * Sidebar spécialisée pour les clients EcoDeli avec dark mode
 * Intègre le tutoriel de première connexion et les notifications
 */

"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  // Navigation icons
  Home,
  PlusCircle,
  Package,
  Calendar,
  CreditCard,
  Star,
  Bell,
  HelpCircle,
  Settings,
  User,
  Truck,
  MapPin,
  DollarSign,
  ShoppingBag,
  Archive,
  ChevronDown,
  ChevronRight,
  FileText,
  Wallet,
  Crown,
  Clock,
  TrendingUp
} from 'lucide-react'

// Types pour la navigation
interface NavigationItem {
  key: string
  label: string
  href: string
  icon: any
  category?: string
  badge?: string | number
  children?: NavigationItem[]
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

// Configuration de la navigation par abonnement
const getClientNavigation = (subscription?: string): NavigationItem[] => [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    href: '/client',
    icon: Home,
    category: 'main'
  },
  {
    key: 'announcements',
    label: 'Annonces',
    href: '/client/announcements',
    icon: Package,
    category: 'main',
    children: [
      {
        key: 'create-announcement',
        label: 'Créer une annonce',
        href: '/client/announcements/create',
        icon: PlusCircle
      },
      {
        key: 'my-announcements',
        label: 'Mes annonces',
        href: '/client/announcements/my-announcements',
        icon: Package,
        badge: 3
      },
      {
        key: 'announcements-history',
        label: 'Historique',
        href: '/client/announcements/history',
        icon: Archive
      }
    ]
  },
  {
    key: 'deliveries',
    label: 'Livraisons',
    href: '/client/deliveries',
    icon: Truck,
    category: 'main',
    badge: 2,
    children: [
      {
        key: 'active-deliveries',
        label: 'En cours',
        href: '/client/deliveries/active',
        icon: Clock,
        badge: 2
      },
      {
        key: 'delivery-tracking',
        label: 'Suivi',
        href: '/client/deliveries/tracking',
        icon: MapPin
      },
      {
        key: 'delivery-history',
        label: 'Historique',
        href: '/client/deliveries/history',
        icon: Archive
      }
    ]
  },
  {
    key: 'services',
    label: 'Services',
    href: '/client/services',
    icon: Settings,
    category: 'services',
    children: [
      {
        key: 'service-bookings',
        label: 'Réservations',
        href: '/client/services/bookings',
        icon: Calendar,
        badge: 1
      },
      {
        key: 'service-providers',
        label: 'Prestataires',
        href: '/client/services/providers',
        icon: User
      }
    ]
  },
  {
    key: 'storage',
    label: 'Box de stockage',
    href: '/client/storage',
    icon: Archive,
    category: 'services',
    children: [
      {
        key: 'storage-boxes',
        label: 'Mes box',
        href: '/client/storage/boxes',
        icon: Package
      },
      {
        key: 'storage-booking',
        label: 'Réserver',
        href: '/client/storage/booking',
        icon: PlusCircle
      }
    ]
  },
  {
    key: 'payments',
    label: 'Paiements',
    href: '/client/payments',
    icon: CreditCard,
    category: 'account',
    children: [
      {
        key: 'payment-methods',
        label: 'Moyens de paiement',
        href: '/client/payments/methods',
        icon: CreditCard
      },
      {
        key: 'payment-history',
        label: 'Historique',
        href: '/client/payments/history',
        icon: FileText
      }
    ]
  },
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
  account: 'Compte',
  help: 'Aide'
}

function NavigationItem({ 
  item, 
  isActive, 
  isExpanded, 
  onToggle, 
  collapsed,
  level = 0 
}: {
  item: NavigationItem
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  collapsed: boolean
  level?: number
}) {
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <div key={item.key}>
        <div className={cn(
          "group relative",
          level > 0 && "ml-6"
        )}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-10 px-3",
              isActive && "bg-accent text-accent-foreground",
              collapsed && "px-2"
            )}
            onClick={onToggle}
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
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </>
            )}
          </Button>
          {isExpanded && !collapsed && item.children && (
            <div className="mt-1 ml-6 space-y-1">
              {item.children.map((child) => (
                <NavigationItem
                  key={child.key}
                  item={child}
                  isActive={false}
                  isExpanded={false}
                  onToggle={() => {}}
                  collapsed={false}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-10 px-3",
        isActive && "bg-accent text-accent-foreground",
        collapsed && "px-2"
      )}
      asChild
    >
      <Link 
        href={item.href}
        data-tutorial={item.key === 'create-announcement' ? 'create-announcement' : undefined}
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
          </>
        )}
      </Link>
    </Button>
  )
}

export function ClientSidebar({ className, collapsed = false, user }: ClientSidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['announcements']))
  
  const navigation = getClientNavigation(user?.subscription)

  const toggleExpanded = (key: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

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
                Client {user.subscription || 'FREE'}
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
                    isExpanded={expandedItems.has(item.key)}
                    onToggle={() => toggleExpanded(item.key)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
              {!collapsed && <Separator className="my-4" />}
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