'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  isActive?: boolean
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
  showHome?: boolean
  maxItems?: number
}

/**
 * Composant principal Breadcrumbs
 */
export function Breadcrumbs({
  items,
  className,
  showHome = true,
  maxItems = 5
}: BreadcrumbsProps) {
  const pathname = usePathname()
  
  // Générer automatiquement les breadcrumbs depuis l'URL si pas d'items fournis
  const autoItems = items || generateBreadcrumbsFromPath(pathname)
  
  // Ajouter l'accueil si demandé
  const allItems = showHome ? [
    { label: 'Accueil', href: '/', icon: Home },
    ...autoItems
  ] : autoItems

  // Limiter le nombre d'items affichés
  const displayItems = allItems.length > maxItems 
    ? [
        allItems[0],
        { label: '...', href: undefined },
        ...allItems.slice(-maxItems + 2)
      ]
    : allItems

  if (displayItems.length === 0) {
    return null
  }

  return (
    <nav 
      aria-label="Fil d'Ariane" 
      className={cn("flex items-center space-x-1 text-sm", className)}
    >
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          const IconComponent = item.icon

          return (
            <li key={`${item.label}-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-1 transition-colors",
                    "text-muted-foreground hover:text-foreground",
                    "focus:outline-none focus:text-foreground"
                  )}
                >
                  {IconComponent && (
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[150px]">{item.label}</span>
                </Link>
              ) : (
                <span 
                  className={cn(
                    "flex items-center space-x-1",
                    isLast ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {IconComponent && (
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[150px]">{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Breadcrumb simple pour pages spécifiques
 */
export function SimpleBreadcrumbs({
  items,
  homeHref = "/",
  homeLabel = "Accueil",
  className
}: {
  items: Array<{ label: string; href?: string }>
  homeHref?: string
  homeLabel?: string
  className?: string
}) {
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: homeLabel, href: homeHref },
    ...items.map((item, index) => ({
      ...item,
      isActive: index === items.length - 1
    }))
  ]

  return <Breadcrumbs items={breadcrumbItems} className={className} />
}

/**
 * Breadcrumb avec style moderne
 */
export function ModernBreadcrumbs({
  items,
  className
}: BreadcrumbsProps) {
  if (!items || items.length === 0) return null

  return (
    <nav 
      aria-label="Fil d'Ariane" 
      className={cn("flex items-center", className)}
    >
      <div className="flex items-center space-x-1 bg-muted rounded-lg px-3 py-1.5">
        {items.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-1 flex-shrink-0" />
            )}
            
            {item.href && !item.isActive ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-background"
              >
                {index === 0 && <Home className="h-3 w-3 mr-1 inline" />}
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-foreground px-2 py-1">
                {index === 0 && <Home className="h-3 w-3 mr-1 inline" />}
                {item.label}
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </nav>
  )
}

/**
 * Composant simplifié pour les breadcrumbs automatiques
 */
export function AutoBreadcrumbs({ 
  className,
  showHome = true,
  maxItems = 5 
}: Omit<BreadcrumbsProps, 'items'>) {
  const pathname = usePathname()
  const items = generateBreadcrumbsFromPath(pathname)
  
  return (
    <Breadcrumbs 
      items={items}
      className={className}
      showHome={showHome}
      maxItems={maxItems}
    />
  )
}

/**
 * Breadcrumbs pour les espaces utilisateur avec contexte
 */
export function UserSpaceBreadcrumbs({
  userRole,
  currentPage,
  className
}: {
  userRole: string
  currentPage?: string
  className?: string
}) {
  const items: BreadcrumbItem[] = []
  
  // Ajouter le dashboard de l'espace utilisateur
  const rolePaths = {
    'CLIENT': '/client',
    'DELIVERER': '/deliverer', 
    'MERCHANT': '/merchant',
    'PROVIDER': '/provider',
    'ADMIN': '/admin'
  }
  
  const roleLabels = {
    'CLIENT': 'Espace Client',
    'DELIVERER': 'Espace Livreur',
    'MERCHANT': 'Espace Commerçant', 
    'PROVIDER': 'Espace Prestataire',
    'ADMIN': 'Administration'
  }
  
  if (userRole in rolePaths) {
    items.push({
      label: roleLabels[userRole as keyof typeof roleLabels],
      href: rolePaths[userRole as keyof typeof rolePaths]
    })
  }
  
  // Ajouter la page actuelle si fournie
  if (currentPage) {
    items.push({
      label: currentPage
    })
  }
  
  return (
    <Breadcrumbs 
      items={items}
      className={className}
      showHome={true}
    />
  )
}

/**
 * Génère automatiquement les breadcrumbs depuis le chemin de l'URL
 */
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  
  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = formatSegmentLabel(segment)
    
    return {
      label,
      href: index < segments.length - 1 ? href : undefined
    }
  })
}

/**
 * Formate un segment d'URL en label lisible
 */
function formatSegmentLabel(segment: string): string {
  // Remplacer les tirets par des espaces et capitaliser
  const formatted = segment
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase -> camel Case
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitaliser chaque mot

  // Traductions spécifiques pour l'interface
  const translations: Record<string, string> = {
    'admin': 'Administration',
    'client': 'Client',
    'deliverer': 'Livreur',
    'merchant': 'Commerçant',
    'provider': 'Prestataire',
    'dashboard': 'Tableau de bord',
    'announcements': 'Annonces',
    'deliveries': 'Livraisons',
    'bookings': 'Réservations',
    'payments': 'Paiements',
    'profile': 'Profil',
    'settings': 'Paramètres',
    'users': 'Utilisateurs',
    'documents': 'Documents',
    'contracts': 'Contrats',
    'invoices': 'Factures',
    'warehouses': 'Entrepôts',
    'storage': 'Stockage',
    'services': 'Services',
    'routes': 'Trajets',
    'tracking': 'Suivi',
    'reports': 'Rapports',
    'analytics': 'Statistiques',
    'notifications': 'Notifications',
    'support': 'Support',
    'help': 'Aide',
    'faq': 'FAQ',
    'about': 'À propos',
    'contact': 'Contact',
    'privacy': 'Confidentialité',
    'terms': 'CGU'
  }

  return translations[segment.toLowerCase()] || formatted
}