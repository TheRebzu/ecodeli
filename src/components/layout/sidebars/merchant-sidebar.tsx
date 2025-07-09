"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  Home,
  Clock,
  Upload,
  TrendingUp,
  Truck,
  CreditCard,
  PlusCircle,
  History
} from 'lucide-react'

interface MerchantSidebarProps {
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

export function MerchantSidebar({ collapsed, user }: MerchantSidebarProps) {
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
      href: '/merchant',
      icon: Home
    },
    {
      label: 'Produits',
      href: '/merchant/products',
      icon: Package,
      submenu: [
        {
          label: 'Mes produits',
          href: '/merchant/products/list',
          icon: Package
        },
        {
          label: 'Ajouter',
          href: '/merchant/products/add',
          icon: PlusCircle
        },
        {
          label: 'Import bulk',
          href: '/merchant/products/import',
          icon: Upload
        }
      ]
    },
    {
      label: 'Commandes',
      href: '/merchant/orders',
      icon: ShoppingCart,
      badge: 8,
      submenu: [
        {
          label: 'Nouvelles',
          href: '/merchant/orders/new',
          icon: Clock
        },
        {
          label: 'En cours',
          href: '/merchant/orders/active',
          icon: Truck
        },
        {
          label: 'Historique',
          href: '/merchant/orders/history',
          icon: History
        }
      ]
    },
    {
      label: 'Lâcher de chariot',
      href: '/merchant/cart-drop',
      icon: ShoppingCart,
      submenu: [
        {
          label: 'Configuration',
          href: '/merchant/cart-drop/settings',
          icon: Settings
        },
        {
          label: 'Zones de livraison',
          href: '/merchant/cart-drop/zones',
          icon: Package
        },
        {
          label: 'Créneaux',
          href: '/merchant/cart-drop/schedules',
          icon: Clock
        }
      ]
    },
    {
      label: 'Contrats',
      href: '/merchant/contracts',
      icon: FileText,
      submenu: [
        {
          label: 'Mon contrat',
          href: '/merchant/contracts/current',
          icon: FileText
        },
        {
          label: 'Négociation',
          href: '/merchant/contracts/negotiation',
          icon: TrendingUp
        },
        {
          label: 'Historique',
          href: '/merchant/contracts/history',
          icon: History
        }
      ]
    },
    {
      label: 'Finances',
      href: '/merchant/finances',
      icon: DollarSign,
      submenu: [
        {
          label: 'Revenus',
          href: '/merchant/finances/revenue',
          icon: BarChart3
        },
        {
          label: 'Paiements',
          href: '/merchant/finances/payments',
          icon: CreditCard
        },
        {
          label: 'Factures',
          href: '/merchant/finances/invoices',
          icon: FileText
        }
      ]
    },
    {
      label: 'Analytics',
      href: '/merchant/analytics',
      icon: BarChart3,
      submenu: [
        {
          label: 'Vue d\'ensemble',
          href: '/merchant/analytics',
          icon: BarChart3
        },
        {
          label: 'Ventes',
          href: '/merchant/analytics/sales',
          icon: TrendingUp
        },
        {
          label: 'Clients',
          href: '/merchant/analytics/customers',
          icon: User
        },
        {
          label: 'Livraisons',
          href: '/merchant/analytics/deliveries',
          icon: Truck
        }
      ]
    },
    {
      label: 'Clients',
      href: '/merchant/customers',
      icon: User,
      submenu: [
        {
          label: 'Base clients',
          href: '/merchant/customers',
          icon: User
        },
        {
          label: 'Segmentation',
          href: '/merchant/customers/segments',
          icon: BarChart3
        },
        {
          label: 'Communication',
          href: '/merchant/customers/communication',
          icon: Bell
        }
      ]
    },
    {
      label: 'Inventaire',
      href: '/merchant/inventory',
      icon: Package,
      submenu: [
        {
          label: 'Catalogue',
          href: '/merchant/inventory',
          icon: Package
        },
        {
          label: 'Stock',
          href: '/merchant/inventory/stock',
          icon: Package
        },
        {
          label: 'Fournisseurs',
          href: '/merchant/inventory/suppliers',
          icon: Truck
        }
      ]
    },
    {
      label: 'Documents',
      href: '/merchant/documents',
      icon: FileText
    },
    {
      label: 'Profil',
      href: '/merchant/profile',
      icon: User
    }
  ]

  const isActive = (href: string) => {
    if (href === '/merchant') {
      return pathname === '/merchant'
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
    <div className="flex h-full flex-col border-r bg-background dark:bg-background">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">EcoDeli</span>
          </div>
        ) : (
          <Store className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        )}
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
              <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Commerçant
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map(item => renderNavigationItem(item))}
      </nav>

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