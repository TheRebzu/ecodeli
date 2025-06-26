'use client'

import { useState } from 'react'
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Shield, 
  CreditCard,
  Bell,
  HelpCircle,
  Star,
  Wallet,
  Calendar,
  BarChart3,
  FileText,
  Award
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { type UserMenuProps, type EcoDeliUser, type QuickAction } from '../types/layout.types'

// Actions par défaut selon le rôle
const getDefaultActions = (role: string): QuickAction[] => {
  const baseActions: QuickAction[] = [
    { key: 'profile', label: 'Mon profil', icon: 'User', href: '/profile' },
    { key: 'settings', label: 'Paramètres', icon: 'Settings', href: '/settings' },
    { key: 'help', label: 'Aide', icon: 'HelpCircle', href: '/help' }
  ]

  const roleSpecificActions: Record<string, QuickAction[]> = {
    CLIENT: [
      { key: 'subscription', label: 'Abonnement', icon: 'CreditCard', href: '/client/subscription' },
      { key: 'announcements', label: 'Mes annonces', icon: 'FileText', href: '/client/announcements' }
    ],
    DELIVERER: [
      { key: 'wallet', label: 'Mon wallet', icon: 'Wallet', href: '/deliverer/wallet' },
      { key: 'planning', label: 'Planning', icon: 'Calendar', href: '/deliverer/planning' },
      { key: 'stats', label: 'Statistiques', icon: 'BarChart3', href: '/deliverer/stats' }
    ],
    MERCHANT: [
      { key: 'stores', label: 'Mes magasins', icon: 'FileText', href: '/merchant/stores' },
      { key: 'analytics', label: 'Analytics', icon: 'BarChart3', href: '/merchant/analytics' }
    ],
    PROVIDER: [
      { key: 'services', label: 'Mes services', icon: 'FileText', href: '/provider/services' },
      { key: 'certifications', label: 'Certifications', icon: 'Award', href: '/provider/certifications' },
      { key: 'planning', label: 'Planning', icon: 'Calendar', href: '/provider/planning' }
    ],
    ADMIN: [
      { key: 'dashboard', label: 'Administration', icon: 'Shield', href: '/admin' },
      { key: 'users', label: 'Utilisateurs', icon: 'User', href: '/admin/users' }
    ]
  }

  return [...(roleSpecificActions[role] || []), ...baseActions]
}

export function UserMenu({
  user,
  onAction,
  quickActions,
  className
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const actions = quickActions || getDefaultActions(user.role)
  
  const getStatusBadge = () => {
    if (user.role === 'ADMIN') {
      return { text: 'Admin', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
    }
    
    switch (user.validationStatus) {
      case 'VALIDATED':
        return { text: 'Vérifié', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
      case 'PENDING_VALIDATION':
        return { text: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
      case 'REJECTED':
        return { text: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
      default:
        return { text: 'Non vérifié', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' }
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      CLIENT: 'Client',
      DELIVERER: 'Livreur',
      MERCHANT: 'Commerçant',
      PROVIDER: 'Prestataire',
      ADMIN: 'Administrateur'
    }
    return labels[role] || role
  }

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      User, Settings, LogOut, Shield, CreditCard, Bell, HelpCircle, 
      Star, Wallet, Calendar, BarChart3, FileText, Award
    }
    const IconComponent = icons[iconName]
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null
  }

  const handleLogout = () => {
    onAction('logout')
    setIsOpen(false)
  }

  const statusBadge = getStatusBadge()

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg",
          "hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted",
          "bg-background border border-border"
        )}
      >
        {/* Avatar */}
        <div className="relative">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || user.email}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Indicateur de statut */}
          <div className={cn(
            "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
            user.isActive ? "bg-green-500" : "bg-gray-400"
          )} />
        </div>

        {/* Informations utilisateur */}
        <div className="hidden sm:block text-left min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {user.name || user.email.split('@')[0]}
          </p>
          <p className="text-xs text-muted-foreground">
            {getRoleLabel(user.role)}
          </p>
        </div>

        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform hidden sm:block",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className={cn(
            "absolute right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50",
            "w-64 sm:w-72 max-w-[calc(100vw-2rem)]"
          )}>
            {/* Header utilisateur */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || user.email}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-lg font-medium">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {user.name || user.email.split('@')[0]}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      statusBadge.color
                    )}>
                      {statusBadge.text}
                    </span>
                    {user.subscriptionPlan && user.subscriptionPlan !== 'FREE' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {user.subscriptionPlan}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats rapides */}
              {user.stats && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {user.rating && (
                    <div>
                      <div className="text-lg font-semibold text-foreground flex items-center justify-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span>{user.rating.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Note</div>
                    </div>
                  )}
                  {user.stats.totalTransactions && (
                    <div>
                      <div className="text-lg font-semibold text-foreground">
                        {user.stats.totalTransactions}
                      </div>
                      <div className="text-xs text-muted-foreground">Transactions</div>
                    </div>
                  )}
                  {user.stats.totalEarnings && (
                    <div>
                      <div className="text-lg font-semibold text-foreground">
                        {user.stats.totalEarnings}€
                      </div>
                      <div className="text-xs text-muted-foreground">Gains</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions rapides */}
            <div className="p-2">
              {actions.map((action) => (
                <button
                  key={action.key}
                  onClick={() => {
                    if (action.href) {
                      window.location.href = action.href
                    } else if (action.onClick) {
                      action.onClick()
                    } else {
                      onAction(action.key)
                    }
                    setIsOpen(false)
                  }}
                  disabled={action.disabled}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left",
                    "hover:bg-muted transition-colors text-sm",
                    action.disabled ? "opacity-50 cursor-not-allowed" : "text-foreground",
                    action.variant === 'destructive' && "text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  )}
                >
                  {getIcon(action.icon)}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* Séparateur */}
            <div className="border-t border-border" />

            {/* Déconnexion */}
            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Version mobile simplifiée
 */
export function MobileUserMenu({
  user,
  onAction,
  className
}: Pick<UserMenuProps, 'user' | 'onAction' | 'className'>) {
  return (
    <div className={cn("space-y-1", className)}>
      {/* Informations utilisateur */}
      <div className="flex items-center space-x-3 px-4 py-3 bg-muted rounded-lg">
        <div className="relative">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || user.email}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-medium">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {user.name || user.email.split('@')[0]}
          </p>
          <p className="text-sm text-muted-foreground">
            {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-1">
        {getDefaultActions(user.role).map((action) => (
          <Link
            key={action.key}
            href={action.href || '#'}
            className="flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted transition-colors rounded-lg"
          >
            {getIcon(action.icon)}
            <span>{action.label}</span>
          </Link>
        ))}
        
        <button
          onClick={() => onAction('logout')}
          className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors rounded-lg"
        >
          <LogOut className="h-4 w-4" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  )
}