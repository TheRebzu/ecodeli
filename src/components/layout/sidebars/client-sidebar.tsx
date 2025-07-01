/**
 * Sidebar spécialisée pour les clients EcoDeli avec dark mode
 */

'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  LayoutDashboard,
  FileText,
  Plus,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  Briefcase,
  Users,
  Home,
  Wrench,
  Package,
  Box,
  Calendar,
  Crown,
  CreditCard,
  History,
  Star,
  GraduationCap,
  HelpCircle,
  MessageCircle,
  LifeBuoy,
  ChevronRight,
  ChevronDown,
  User
} from 'lucide-react'

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
    subscription?: 'FREE' | 'STARTER' | 'PREMIUM'
  }
}

// Configuration de navigation pour les clients
const getClientNavigation = (subscription?: string): NavigationItem[] => [
  // Navigation principale
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    href: '/client',
    icon: LayoutDashboard,
    category: 'main'
  },
  
  // Annonces
  {
    key: 'announcements',
    label: 'Mes annonces',
    href: '/client/announcements',
    icon: FileText,
    category: 'main',
    children: [
      {
        key: 'create-announcement',
        label: 'Créer une annonce',
        href: '/client/announcements/create',
        icon: Plus
      },
      {
        key: 'active-announcements',
        label: 'Annonces actives',
        href: '/client/announcements?status=active',
        icon: Clock
      },
      {
        key: 'completed-announcements',
        label: 'Annonces terminées',
        href: '/client/announcements?status=completed',
        icon: CheckCircle
      }
    ]
  },

  // Livraisons et suivi
  {
    key: 'deliveries',
    label: 'Mes livraisons',
    href: '/client/deliveries',
    icon: Truck,
    category: 'main'
  },
  {
    key: 'tracking',
    label: 'Suivi en temps réel',
    href: '/client/tracking',
    icon: MapPin,
    category: 'main'
  },

  // Services (page unifiée)
  {
    key: 'services',
    label: 'Services',
    href: '/client/services',
    icon: Briefcase,
    category: 'services'
  },

  // Stockage (page existante)
  {
    key: 'storage',
    label: 'Stockage',
    href: '/client/storage',
    icon: Package,
    category: 'services'
  },

  // Réservations
  {
    key: 'bookings',
    label: 'Mes réservations',
    href: '/client/bookings',
    icon: Calendar,
    category: 'services'
  },

  // Profil et compte
  {
    key: 'profile',
    label: 'Mon profil',
    href: '/client/profile',
    icon: User,
    category: 'account'
  },
  {
    key: 'subscription',
    label: 'Mon abonnement',
    href: '/client/subscription',
    icon: Crown,
    category: 'account',
    badge: subscription === 'FREE' ? 'Upgrade' : undefined
  },
  {
    key: 'payments',
    label: 'Paiements',
    href: '/client/payments',
    icon: CreditCard,
    category: 'account'
  },

  // Évaluations
  {
    key: 'reviews',
    label: 'Mes évaluations',
    href: '/client/reviews',
    icon: Star,
    category: 'account'
  },

  // Tutoriel et aide
  {
    key: 'tutorial',
    label: 'Tutoriel',
    href: '/client/tutorial',
    icon: GraduationCap,
    category: 'help'
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
  const indent = level * 16

  if (hasChildren) {
    return (
      <div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-10 px-3",
            isActive && "bg-accent text-accent-foreground",
            collapsed && "px-2"
          )}
          style={{ paddingLeft: collapsed ? 8 : 12 + indent }}
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
          <div className="ml-4 space-y-1">
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
      style={{ paddingLeft: collapsed ? 8 : 12 + indent }}
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
      "flex h-full flex-col border-r bg-background",
      collapsed ? "w-16" : "w-64",
      className
    )}>
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

      {/* Footer avec version */}
      {!collapsed && (
        <div className="border-t p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              EcoDeli v1.0.0
            </p>
            <p className="text-xs text-muted-foreground">
              Client Dashboard
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function useClientNavigation(user?: any) {
  return getClientNavigation(user?.subscription)
}