/**
 * Sidebar spécialisée pour les clients EcoDeli
 */

import { BaseSidebar } from './base-sidebar'
import { type BaseSidebarProps, type NavigationItem } from '../types/layout.types'

// Configuration de navigation pour les clients
const getClientNavigation = (): NavigationItem[] => [
  // Navigation principale
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    href: '/client',
    icon: 'LayoutDashboard',
    category: 'main'
  },
  
  // Annonces
  {
    key: 'announcements',
    label: 'Mes annonces',
    href: '/client/announcements',
    icon: 'FileText',
    category: 'main',
    children: [
      {
        key: 'create-announcement',
        label: 'Créer une annonce',
        href: '/client/announcements/create',
        icon: 'Plus'
      },
      {
        key: 'active-announcements',
        label: 'Annonces actives',
        href: '/client/announcements?status=active',
        icon: 'Clock'
      },
      {
        key: 'completed-announcements',
        label: 'Annonces terminées',
        href: '/client/announcements?status=completed',
        icon: 'CheckCircle'
      }
    ]
  },

  // Livraisons et suivi
  {
    key: 'deliveries',
    label: 'Mes livraisons',
    href: '/client/deliveries',
    icon: 'Truck',
    category: 'main'
  },
  {
    key: 'tracking',
    label: 'Suivi en temps réel',
    href: '/client/tracking',
    icon: 'MapPin',
    category: 'main'
  },

  // Services
  {
    key: 'services',
    label: 'Services',
    href: '/client/services',
    icon: 'Briefcase',
    category: 'services',
    children: [
      {
        key: 'personal-services',
        label: 'Services à la personne',
        href: '/client/services/personal',
        icon: 'Users'
      },
      {
        key: 'home-services',
        label: 'Services à domicile',
        href: '/client/services/home',
        icon: 'Home'
      },
      {
        key: 'maintenance',
        label: 'Maintenance',
        href: '/client/services/maintenance',
        icon: 'Wrench'
      }
    ]
  },

  // Stockage
  {
    key: 'storage',
    label: 'Stockage',
    href: '/client/storage',
    icon: 'Package',
    category: 'services',
    children: [
      {
        key: 'my-boxes',
        label: 'Mes box',
        href: '/client/storage/boxes',
        icon: 'Box'
      },
      {
        key: 'rent-box',
        label: 'Louer une box',
        href: '/client/storage/rent',
        icon: 'Plus'
      },
      {
        key: 'nearby-warehouses',
        label: 'Entrepôts à proximité',
        href: '/client/storage/warehouses',
        icon: 'MapPin'
      }
    ]
  },

  // Réservations
  {
    key: 'bookings',
    label: 'Mes réservations',
    href: '/client/bookings',
    icon: 'Calendar',
    category: 'services'
  },

  // Paiements et abonnement
  {
    key: 'subscription',
    label: 'Mon abonnement',
    href: '/client/subscription',
    icon: 'Crown',
    category: 'account'
  },
  {
    key: 'payments',
    label: 'Paiements',
    href: '/client/payments',
    icon: 'CreditCard',
    category: 'account',
    children: [
      {
        key: 'payment-history',
        label: 'Historique',
        href: '/client/payments/history',
        icon: 'History'
      },
      {
        key: 'payment-methods',
        label: 'Moyens de paiement',
        href: '/client/payments/methods',
        icon: 'CreditCard'
      },
      {
        key: 'invoices',
        label: 'Factures',
        href: '/client/payments/invoices',
        icon: 'FileText'
      }
    ]
  },

  // Évaluations
  {
    key: 'reviews',
    label: 'Mes évaluations',
    href: '/client/reviews',
    icon: 'Star',
    category: 'account'
  },

  // Tutoriel et aide
  {
    key: 'tutorial',
    label: 'Tutoriel',
    href: '/client/tutorial',
    icon: 'GraduationCap',
    category: 'help'
  },
  {
    key: 'support',
    label: 'Support',
    href: '/client/support',
    icon: 'HelpCircle',
    category: 'help',
    children: [
      {
        key: 'faq',
        label: 'FAQ',
        href: '/client/support/faq',
        icon: 'MessageCircle'
      },
      {
        key: 'tickets',
        label: 'Mes tickets',
        href: '/client/support/tickets',
        icon: 'Ticket'
      },
      {
        key: 'contact',
        label: 'Nous contacter',
        href: '/client/support/contact',
        icon: 'Mail'
      }
    ]
  },

  // Paramètres
  {
    key: 'settings',
    label: 'Paramètres',
    href: '/client/settings',
    icon: 'Settings',
    category: 'help',
    children: [
      {
        key: 'profile',
        label: 'Mon profil',
        href: '/client/settings/profile',
        icon: 'User'
      },
      {
        key: 'notifications',
        label: 'Notifications',
        href: '/client/settings/notifications',
        icon: 'Bell'
      },
      {
        key: 'privacy',
        label: 'Confidentialité',
        href: '/client/settings/privacy',
        icon: 'Shield'
      }
    ]
  }
]

export function ClientSidebar(props: Omit<BaseSidebarProps, 'role' | 'navigationItems'>) {
  return (
    <BaseSidebar
      {...props}
      role="CLIENT"
      navigationItems={getClientNavigation()}
    />
  )
}

/**
 * Hook pour obtenir la navigation client avec badges dynamiques
 */
export function useClientNavigation(user?: any) {
  const baseNavigation = getClientNavigation()
  
  // Ajouter des badges dynamiques basés sur les données utilisateur
  return baseNavigation.map(item => {
    switch (item.key) {
      case 'announcements':
        return {
          ...item,
          badge: user?.stats?.activeAnnouncements || undefined
        }
      case 'deliveries':
        return {
          ...item,
          badge: user?.stats?.activeDeliveries || undefined
        }
      case 'bookings':
        return {
          ...item,
          badge: user?.stats?.pendingBookings || undefined
        }
      case 'support':
        return {
          ...item,
          badge: user?.stats?.openTickets || undefined
        }
      default:
        return item
    }
  })
}