/**
 * Footer minimal pour les dashboards EcoDeli
 */

import Link from 'next/link'
import { Package, HelpCircle, Shield, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { type DashboardFooterProps } from '../types/layout.types'

export function DashboardFooter({
  showVersion = true,
  showSupport = true,
  className
}: DashboardFooterProps) {
  return (
    <footer className={cn(
      "border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "py-4 px-6 mt-auto",
      className
    )}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Section gauche - Branding et version */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">EcoDeli</span>
          </div>
          
          <span className="text-muted-foreground">
            © 2024 - Tous droits réservés
          </span>
          
          {showVersion && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              v1.0.0
            </span>
          )}
        </div>

        {/* Section droite - Liens et actions */}
        <div className="flex items-center space-x-4">
          {/* Liens utiles */}
          {showSupport && (
            <div className="flex items-center space-x-3 text-sm">
              <Link
                href="/support"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Support</span>
              </Link>
              
              <Link
                href="/legal/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
              >
                <Shield className="h-3 w-3" />
                <span>Confidentialité</span>
              </Link>
              
              <Link
                href="/status"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Statut</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Contrôles */}
          <div className="flex items-center space-x-2">
            <ThemeToggle variant="icon-only" size="sm" />
            <LanguageSwitcher variant="icon-only" />
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * Footer ultra-minimal pour les modales et overlays
 */
export function MinimalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn(
      "flex items-center justify-center py-2 text-xs text-muted-foreground",
      className
    )}>
      <div className="flex items-center space-x-1">
        <Package className="h-3 w-3" />
        <span>EcoDeli © 2024</span>
      </div>
    </footer>
  )
}

/**
 * Footer avec informations de session
 */
export function SessionFooter({
  user,
  lastActivity,
  className
}: {
  user?: { name?: string; email: string; role: string }
  lastActivity?: Date
  className?: string
}) {
  const formatLastActivity = (date?: Date) => {
    if (!date) return 'Inconnue'
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'À l\'instant'
    if (minutes < 60) return `Il y a ${minutes}min`
    if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)}h`
    return date.toLocaleDateString('fr-FR')
  }

  return (
    <footer className={cn(
      "border-t border-border bg-muted/30 py-3 px-6",
      className
    )}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        {/* Informations utilisateur */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Package className="h-3 w-3" />
            <span className="font-medium">EcoDeli</span>
          </div>
          
          {user && (
            <div className="flex items-center space-x-2">
              <span>Connecté en tant que</span>
              <span className="font-medium text-foreground">
                {user.name || user.email}
              </span>
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
                {user.role}
              </span>
            </div>
          )}
        </div>

        {/* Informations de session */}
        <div className="flex items-center space-x-4">
          <span>Dernière activité : {formatLastActivity(lastActivity)}</span>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle variant="icon-only" size="sm" />
            <LanguageSwitcher variant="icon-only" />
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * Footer avec statistiques en temps réel
 */
export function StatsFooter({
  stats = {
    users,
    deliveries,
    uptime: '99.9%'
  },
  className
}: {
  stats?: {
    users: number
    deliveries: number
    uptime: string
  }
  className?: string
}) {
  return (
    <footer className={cn(
      "border-t border-border bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 py-3 px-6",
      className
    )}>
      <div className="flex items-center justify-between text-xs">
        {/* Branding */}
        <div className="flex items-center space-x-2">
          <Package className="h-3 w-3 text-primary" />
          <span className="font-semibold">EcoDeli Dashboard</span>
        </div>

        {/* Statistiques temps réel */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">
              {stats.users.toLocaleString()} utilisateurs en ligne
            </span>
          </div>
          
          <div className="text-muted-foreground">
            {stats.deliveries.toLocaleString()} livraisons aujourd'hui
          </div>
          
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-muted-foreground">Uptime {stats.uptime}</span>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex items-center space-x-2">
          <ThemeToggle variant="icon-only" size="sm" />
          <LanguageSwitcher variant="icon-only" />
        </div>
      </div>
    </footer>
  )
}