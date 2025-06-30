"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Truck,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Star,
  Settings,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  Home,
  Route,
  Clock,
  Wallet,
  TrendingUp
} from 'lucide-react'

interface DelivererSidebarProps {
  collapsed: boolean
  user: {
    id: string
    name?: string
    email: string
    role: string
  }
}

interface NavigationItem {
  label: string
  href: string
  icon: any
  badge?: number
  submenu?: NavigationItem[]
}

export function DelivererSidebar({ collapsed, user }: DelivererSidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const navigationItems: NavigationItem[] = [
    {
      label: 'Tableau de bord',
      href: '/deliverer',
      icon: Home
    },
    {
      label: 'Livraisons',
      href: '/deliverer/deliveries',
      icon: Package,
      badge: 3,
      submenu: [
        {
          label: 'En cours',
          href: '/deliverer/deliveries/active',
          icon: Clock
        },
        {
          label: 'Historique',
          href: '/deliverer/deliveries/history',
          icon: FileText
        }
      ]
    },
    {
      label: 'Opportunités',
      href: '/deliverer/opportunities',
      icon: TrendingUp,
      badge: 12
    },
    {
      label: 'Trajets',
      href: '/deliverer/routes',
      icon: Route,
      submenu: [
        {
          label: 'Mes trajets',
          href: '/deliverer/routes/my-routes',
          icon: MapPin
        },
        {
          label: 'Planification',
          href: '/deliverer/planning',
          icon: Calendar
        }
      ]
    },
    {
      label: 'Portefeuille',
      href: '/deliverer/wallet',
      icon: Wallet,
      submenu: [
        {
          label: 'Gains',
          href: '/deliverer/wallet/earnings',
          icon: DollarSign
        },
        {
          label: 'Retraits',
          href: '/deliverer/wallet/withdrawals',
          icon: TrendingUp
        }
      ]
    },
    {
      label: 'Documents',
      href: '/deliverer/documents',
      icon: FileText
    },
    {
      label: 'Profil',
      href: '/deliverer/profile',
      icon: User
    }
  ]

  const isActive = (href: string) => {
    if (href === '/deliverer') {
      return pathname === '/deliverer'
    }
    return pathname.startsWith(href)
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const active = isActive(item.href)
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isExpanded = expandedItems.includes(item.href)

    return (
      <div key={item.href}>
        <div className={cn(
          "group relative",
          level > 0 && "ml-6"
        )}>
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
              active && "bg-accent text-accent-foreground",
              collapsed && "justify-center px-2"
            )}
            onClick={hasSubmenu ? (e) => {
              e.preventDefault()
              toggleExpanded(item.href)
            } : undefined}
          >
            <item.icon className={cn(
              "h-4 w-4",
              active && "text-accent-foreground"
            )} />
            
            {!collapsed && (
              <>
                <span className="truncate">{item.label}</span>
                
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
                
                {hasSubmenu && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleExpanded(item.href)
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            )}
          </Link>

          {/* Submenu */}
          {hasSubmenu && !collapsed && isExpanded && (
            <div className="mt-1 ml-6 space-y-1">
              {item.submenu!.map(subItem => renderNavigationItem(subItem, level + 1))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col border-r bg-background">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-blue-800">EcoDeli</span>
          </div>
        ) : (
          <Truck className="h-6 w-6 text-blue-600" />
        )}
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Livreur
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map(item => renderNavigationItem(item))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="space-y-1">
          <Link
            href="/deliverer/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
              collapsed && "justify-center px-2"
            )}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Paramètres</span>}
          </Link>
          
          <Link
            href="/deliverer/help"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
              collapsed && "justify-center px-2"
            )}
          >
            <Bell className="h-4 w-4" />
            {!collapsed && <span>Aide</span>}
          </Link>
        </div>
      </div>
    </div>
  )
}
