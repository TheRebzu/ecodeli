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
  CreditCard,
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
  Euro,
  PlusCircle,
  History,
  Calculator,
  Receipt,
  MapPin,
  Plus,
  Percent,
  Gift,
  Target
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
  const t = useTranslations('sidebar')

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  // Navigation selon le cahier des charges EcoDeli 2024-2025
  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      href: '/merchant',
      icon: Home
    },
    // SERVICE PHARE : Lâcher de chariot (mis en avant)
    {
      label: 'Lâcher de Chariot',
      href: '/merchant/cart-drop',
      icon: ShoppingCart,
      badge: 3, // Nouvelles commandes
      submenu: [
        {
          label: 'Configuration',
          href: '/merchant/cart-drop/settings',
          icon: Settings
        },
        {
          label: 'Commandes',
          href: '/merchant/cart-drop/orders',
          icon: Clock
        },
        {
          label: 'Zones de livraison',
          href: '/merchant/cart-drop/zones',
          icon: MapPin
        }
      ]
    },
    // EXIGENCE : Gestion des annonces
    {
      label: 'Gestion des Annonces',
      href: '/merchant/announcements',
      icon: Package,
      submenu: [
        {
          label: 'Toutes les annonces',
          href: '/merchant/announcements',
          icon: Package
        },
        {
          label: 'Créer une annonce',
          href: '/merchant/announcements/create',
          icon: PlusCircle
        },
        {
          label: 'Import en masse',
          href: '/merchant/announcements/bulk',
          icon: Upload
        }
      ]
    },
    // NOUVEAU : Gestion des promotions et codes promo
    {
      label: 'Promotions & Codes Promo',
      href: '/merchant/promotions',
      icon: Gift,
      submenu: [
        {
          label: 'Toutes les promotions',
          href: '/merchant/promotions',
          icon: Gift
        },
        {
          label: 'Créer une promotion',
          href: '/merchant/promotions/create',
          icon: PlusCircle
        },
        {
          label: 'Modèles de campagnes',
          href: '/merchant/promotions/templates',
          icon: Target
        },
        {
          label: 'Performances',
          href: '/merchant/promotions/analytics',
          icon: BarChart3
        }
      ]
    },
    // EXIGENCE : Gestion de son contrat
    {
      label: 'Gestion des Contrats',
      href: '/merchant/contracts',
      icon: FileText,
      submenu: [
        {
          label: 'Mon contrat actuel',
          href: '/merchant/contracts',
          icon: FileText
        },
        {
          label: 'Conditions tarifaires',
          href: '/merchant/contracts/pricing',
          icon: Calculator
        },
        {
          label: 'Renouvellement',
          href: '/merchant/contracts/renewal',
          icon: History
        }
      ]
    },
    // EXIGENCE : Gestion de la facturation des services demandés
    {
      label: 'Facturation Services',
      href: '/merchant/billing',
      icon: Receipt,
      submenu: [
        {
          label: 'Toutes les factures',
          href: '/merchant/billing',
          icon: Receipt
        },
        {
          label: 'Créer une facture',
          href: '/merchant/billing/create',
          icon: PlusCircle
        },
        {
          label: 'Paramètres facturation',
          href: '/merchant/billing/settings',
          icon: Settings
        }
      ]
    },
    // EXIGENCE : Accès aux paiements
    {
<<<<<<< Updated upstream
      label: 'Analytics',
=======
      label: 'Accès aux Paiements',
      href: '/merchant/payments',
      icon: CreditCard,
      submenu: [
        {
          label: 'Historique paiements',
          href: '/merchant/payments',
          icon: History
        },
        {
          label: 'Virements',
          href: '/merchant/payments/payouts',
          icon: Euro
        },
        {
          label: 'Paramètres',
          href: '/merchant/payments/settings',
          icon: Settings
        }
      ]
    },
    // Analytics pour pilotage business
    {
      label: 'Analytics Business',
>>>>>>> Stashed changes
      href: '/merchant/analytics',
      icon: BarChart3,
      submenu: [
        {
          label: 'Vue d\'ensemble',
          href: '/merchant/analytics',
<<<<<<< Updated upstream
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
=======
          icon: TrendingUp
        },
        {
          label: 'Performance produits',
          href: '/merchant/analytics/products',
          icon: Package
>>>>>>> Stashed changes
        },
        {
          label: 'Analyse livraisons',
          href: '/merchant/analytics/deliveries',
          icon: Truck
        }
      ]
    },
    // Paramètres compte
    {
<<<<<<< Updated upstream
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
=======
      label: 'Paramètres',
      href: '/merchant/settings',
      icon: Settings,
      submenu: [
        {
          label: 'Profil entreprise',
          href: '/merchant/settings/profile',
          icon: User
        },
        {
          label: 'Notifications',
          href: '/merchant/settings/notifications',
          icon: Bell
        },
        {
          label: 'Sécurité',
          href: '/merchant/settings/security',
          icon: Settings
        }
      ]
>>>>>>> Stashed changes
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
            <div>
              <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">EcoDeli</span>
              <div className="text-xs text-muted-foreground">Espace Commerçant</div>
            </div>
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
                Commerçant partenaire
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation conforme au cahier des charges */}
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map(item => renderNavigationItem(item))}
      </nav>

      {/* Footer avec accès rapide */}
      {!collapsed && (
        <div className="border-t p-4 space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Accès rapide</div>
          <div className="flex items-center justify-between text-xs">
            <Link href="/merchant/cart-drop/orders" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ShoppingCart className="h-3 w-3" />
              <span>Commandes</span>
            </Link>
            <Link href="/merchant/payments" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Euro className="h-3 w-3" />
              <span>Paiements</span>
            </Link>
          </div>
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