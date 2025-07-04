<<<<<<< Updated upstream
<<<<<<< Updated upstream
"use client";

import { useTranslations } from 'next-intl';
import { BaseSidebar } from './base-sidebar';
import { 
  Shield, 
  Users, 
  Package, 
  FileText, 
  BarChart3, 
  Settings, 
  CheckCircle,
  Clock,
  DollarSign,
  Truck,
  Building,
  UserCheck,
  FileX,
  Activity,
  Database,
  TestTube,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { type EcoDeliUser } from '../types/layout.types';

// Interface temporaire pour la navigation (utilisée par BaseSidebar)
interface NavigationItem {
  key: string
  label: string
  href: string
  icon?: any
  category?: string
  badge?: string
  children?: NavigationItem[]
  disabled?: boolean
}

interface AdminSidebarProps {
  user: EcoDeliUser;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AdminSidebar({ user, collapsed, onToggle, className }: AdminSidebarProps) {
  const t = useTranslations('admin.navigation');
  const common = useTranslations('common');

  const navigationItems: NavigationItem[] = [
    // ===== FONCTIONNALITÉS COMPLÈTES =====
    
    // Dashboard principal
    {
      key: 'dashboard',
      label: t('dashboard'),
      href: '/admin',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'main'
    },
    
    // Vérifications et Documents - SYSTÈME COMPLET
    {
      key: 'verifications',
      label: t('verifications.title'),
      href: '/admin/verifications',
      icon: <CheckCircle className="h-4 w-4" />,
      category: 'validation',
      badge: '3', // TODO: dynamic count
      children: [
        {
          key: 'verifications-pending',
          label: t('verifications.pending'),
          href: '/admin/verifications/pending',
          icon: <Clock className="h-4 w-4" />,
          badge: '3'
        },
        {
          key: 'verifications-approved',
          label: t('verifications.approved'),
          href: '/admin/verifications/approved',
          icon: <CheckCircle className="h-4 w-4" />
        },
        {
          key: 'verifications-rejected',
          label: t('verifications.rejected'),
          href: '/admin/verifications/rejected',
          icon: <FileX className="h-4 w-4" />
        },
        {
          key: 'verifications-incomplete',
          label: t('verifications.incomplete'),
          href: '/admin/verifications/incomplete',
          icon: <AlertTriangle className="h-4 w-4" />
        }
      ]
    },

    // Gestion des utilisateurs - FONCTIONNEL
    {
      key: 'users',
      label: t('users.title'),
      href: '/admin/users',
      icon: <Users className="h-4 w-4" />,
      category: 'users'
    },

    // Livraisons - VUE D'ENSEMBLE DISPONIBLE
    {
      key: 'deliveries',
      label: t('deliveries.title'),
      href: '/admin/deliveries',
      icon: <Package className="h-4 w-4" />,
      category: 'operations'
    },

    // Tests Admin - FONCTIONNEL
    {
      key: 'tests',
      label: 'Tests Admin',
      href: '/admin/tests',
      icon: <TestTube className="h-4 w-4" />,
      category: 'development'
    },

    // ===== FONCTIONNALITÉS EN DÉVELOPPEMENT =====
    // Note: Ces sections ont des API mais pas d'interface complète

    // Finance - API DISPONIBLE, interface en cours
    {
      key: 'finance',
      label: t('finance.title') + ' (Dev)',
      href: '#',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'development',
      disabled: true,
      children: [
        {
          key: 'finance-note',
          label: 'API disponible - Interface en cours',
          href: '#',
          icon: <Database className="h-4 w-4" />,
          disabled: true
        }
      ]
    },

    // Contrats - API DISPONIBLE
    {
      key: 'contracts',
      label: 'Contrats (API)',
      href: '#',
      icon: <FileText className="h-4 w-4" />,
      category: 'development',
      disabled: true
    },

    // Settings/Configuration - API DISPONIBLE
    {
      key: 'settings',
      label: t('system.settings') + ' (API)',
      href: '#',
      icon: <Settings className="h-4 w-4" />,
      category: 'development',
      disabled: true
    },

    // ===== ENDPOINTS API DISPONIBLES =====
    {
      key: 'api-info',
      label: '📡 APIs Disponibles',
      href: '#',
      icon: <Database className="h-4 w-4" />,
      category: 'development',
      disabled: true,
      children: [
        {
          key: 'api-payments',
          label: '• Payments API',
          href: '#',
          icon: <DollarSign className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-announcements',
          label: '• Announcements API',
          href: '#',
          icon: <Package className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-services',
          label: '• Services API',
          href: '#',
          icon: <Activity className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-locations',
          label: '• Locations API',
          href: '#',
          icon: <Building className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-monitoring',
          label: '• Monitoring API',
          href: '#',
          icon: <Activity className="h-4 w-4" />,
          disabled: true
        }
      ]
    }
  ];

  return (
    <BaseSidebar
      role="ADMIN"
      user={user}
      navigationItems={navigationItems}
      collapsed={collapsed}
      onToggle={onToggle}
      className={className}
    />
  );
=======
=======
>>>>>>> Stashed changes
"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Shield,
  Users,
  Package,
  FileCheck,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  Home,
  Clock,
  AlertTriangle,
  TrendingUp,
  Truck,
  CreditCard,
  Building,
  MapPin,
  Database,
  Activity,
  Eye,
  CheckCircle
} from 'lucide-react'

interface AdminSidebarProps {
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

export function AdminSidebar({ collapsed, user }: AdminSidebarProps) {
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
      href: '/admin',
      icon: Home
    },
    {
      label: 'Utilisateurs',
      href: '/admin/users',
      icon: Users,
      submenu: [
        {
          label: 'Tous les utilisateurs',
          href: '/admin/users/all',
          icon: Users
        },
        {
          label: 'Clients',
          href: '/admin/users/clients',
          icon: User
        },
        {
          label: 'Livreurs',
          href: '/admin/users/deliverers',
          icon: Truck
        },
        {
          label: 'Commerçants',
          href: '/admin/users/merchants',
          icon: Building
        },
        {
          label: 'Prestataires',
          href: '/admin/users/providers',
          icon: Settings
        }
      ]
    },
    {
      label: 'Validations',
      href: '/admin/validations',
      icon: CheckCircle,
      badge: 15,
      submenu: [
        {
          label: 'Documents',
          href: '/admin/validations/documents',
          icon: FileCheck
        },
        {
          label: 'Comptes livreurs',
          href: '/admin/validations/deliverers',
          icon: Truck
        },
        {
          label: 'Prestataires',
          href: '/admin/validations/providers',
          icon: Settings
        },
        {
          label: 'Contrats',
          href: '/admin/validations/contracts',
          icon: FileCheck
        }
      ]
    },
    {
      label: 'Livraisons',
      href: '/admin/deliveries',
      icon: Package,
      badge: 42,
      submenu: [
        {
          label: 'En cours',
          href: '/admin/deliveries/active',
          icon: Clock
        },
        {
          label: 'Monitoring',
          href: '/admin/deliveries/monitoring',
          icon: Eye
        },
        {
          label: 'Litiges',
          href: '/admin/deliveries/disputes',
          icon: AlertTriangle
        },
        {
          label: 'Historique',
          href: '/admin/deliveries/history',
          icon: Activity
        }
      ]
    },
    {
      label: 'Finances',
      href: '/admin/finances',
      icon: DollarSign,
      submenu: [
        {
          label: 'Vue globale',
          href: '/admin/finances/overview',
          icon: BarChart3
        },
        {
          label: 'Paiements',
          href: '/admin/finances/payments',
          icon: CreditCard
        },
        {
          label: 'Commissions',
          href: '/admin/finances/commissions',
          icon: TrendingUp
        },
        {
          label: 'Factures',
          href: '/admin/finances/invoices',
          icon: FileCheck
        }
      ]
    },
    {
      label: 'Entrepôts',
      href: '/admin/warehouses',
      icon: Building,
      submenu: [
        {
          label: 'Configuration',
          href: '/admin/warehouses/config',
          icon: Settings
        },
        {
          label: 'Box stockage',
          href: '/admin/warehouses/storage',
          icon: Package
        },
        {
          label: 'Capacités',
          href: '/admin/warehouses/capacity',
          icon: BarChart3
        },
        {
          label: 'Localisations',
          href: '/admin/warehouses/locations',
          icon: MapPin
        }
      ]
    },
    {
      label: 'Statistiques',
      href: '/admin/analytics',
      icon: BarChart3,
      submenu: [
        {
          label: 'Performance',
          href: '/admin/analytics/performance',
          icon: TrendingUp
        },
        {
          label: 'Utilisateurs',
          href: '/admin/analytics/users',
          icon: Users
        },
        {
          label: 'Revenus',
          href: '/admin/analytics/revenue',
          icon: DollarSign
        },
        {
          label: 'Rapports',
          href: '/admin/analytics/reports',
          icon: FileCheck
        }
      ]
    },
    {
      label: 'Support',
      href: '/admin/support',
      icon: Bell,
      badge: 7,
      submenu: [
        {
          label: 'Tickets',
          href: '/admin/support/tickets',
          icon: Bell
        },
        {
          label: 'Chat en direct',
          href: '/admin/support/chat',
          icon: Activity
        }
      ]
    },
    {
      label: 'Services Cloud',
      href: '/admin/cloud',
      icon: Database,
      submenu: [
        {
          label: 'Configuration',
          href: '/admin/cloud/config',
          icon: Settings
        },
        {
          label: 'Monitoring',
          href: '/admin/cloud/monitoring',
          icon: Activity
        }
      ]
    },
    {
      label: 'Paramètres',
      href: '/admin/settings',
      icon: Settings,
      submenu: [
        {
          label: 'Système',
          href: '/admin/settings/system',
          icon: Database
        },
        {
          label: 'Sécurité',
          href: '/admin/settings/security',
          icon: Shield
        },
        {
          label: 'Notifications',
          href: '/admin/settings/notifications',
          icon: Bell
        }
      ]
    }
  ]

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
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
            <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            <span className="text-lg font-semibold text-red-800 dark:text-red-200">EcoDeli Admin</span>
          </div>
        ) : (
          <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
        )}
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <User className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name || user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Administrateur
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
              <span className="text-sm text-muted-foreground">Système</span>
            </div>
            <ThemeToggle variant="minimal" />
          </div>
        </div>
      )}
    </div>
  )
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
} 