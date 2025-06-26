/**
 * Index des exports pour le système de layout unifié EcoDeli
 */

// Types
export * from './types/layout.types'

// Providers et hooks
export * from './providers/layout-provider'

// Layouts de base
export * from './core/base-layout'
export * from './core/auth-layout'
export * from './core/dashboard-layout'
export * from './core/public-layout'

// Headers
export * from './headers/base-header'
export * from './headers/public-header'

// Sidebars
export * from './sidebars/base-sidebar'
export * from './sidebars/client-sidebar'

// Footers
export * from './footers/public-footer'
export * from './footers/dashboard-footer'

// Composants transverses
export * from './components/breadcrumbs'
export * from './components/language-switcher'
export * from './components/theme-toggle'
export * from './components/notification-bell'
export * from './components/user-menu'
export * from './components/search-bar'
export * from './components/mobile-menu'

// Hooks utilitaires
export {
  useLayout,
  useSidebar,
  useBreadcrumbs,
  useNotifications,
  useTheme
} from './providers/layout-provider'

// Réexports pour compatibilité (anciens composants)
export { default as AdminHeader } from './admin-header'
export { default as ClientHeader } from './client-header'
export { default as DelivererHeader } from './deliverer-header'
export { default as MerchantHeader } from './merchant-header'
export { default as ProviderHeader } from './provider-header'
export { default as Footer } from './footer'
export { default as PageHeader } from './page-header'
export { default as DashboardLayout } from './dashboard-layout'
export { default as PublicLayout } from './public-layout'

// Aliases pour les nouveaux composants
export { PublicHeader as NewPublicHeader } from './headers/public-header'
export { BaseLayout as NewBaseLayout } from './core/base-layout'
export { AuthLayout as NewAuthLayout } from './core/auth-layout'