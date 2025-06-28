'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import { 
  type LayoutContextType, 
  type LayoutProviderProps,
  type ThemeMode,
  type Notification,
  type BreadcrumbItem
} from '../types/layout.types'

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ 
  children, 
  initialTheme = 'system',
  initialLocale = 'fr',
  initialNotifications = []
}: LayoutProviderProps) {
  // État du thème
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme)
  
  // État de la langue
  const [locale, setLocale] = useState(initialLocale)
  
  // État de la sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // État des notifications
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  
  // État des breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  
  // État mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  
  // Hooks Next.js
  const pathname = usePathname()

  // Gestion du thème
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    
    // Sauvegarder dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecodeli-theme', newTheme)
    }
    
    // Appliquer le thème
    applyTheme(newTheme)
  }

  const applyTheme = (themeMode: ThemeMode) => {
    if (typeof window === 'undefined') return

    const root = window.document.documentElement
    
    if (themeMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.toggle('dark', systemTheme === 'dark')
    } else {
      root.classList.toggle('dark', themeMode === 'dark')
    }
  }

  // Initialisation du thème
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('ecodeli-theme') as ThemeMode
      if (savedTheme) {
        setThemeState(savedTheme)
        applyTheme(savedTheme)
      } else {
        applyTheme(theme)
      }
    }
  }, [])

  // Gestion des changements de thème système
  useEffect(() => {
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Auto-collapse sidebar sur mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true)
      setMobileMenuOpen(false)
    }
  }, [isMobile])

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Gestion de la sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev
      
      // Sauvegarder l'état sur desktop
      if (!isMobile && typeof window !== 'undefined') {
        localStorage.setItem('ecodeli-sidebar-collapsed', newState.toString())
      }
      
      return newState
    })
  }

  // Restaurer l'état de la sidebar sur desktop
  useEffect(() => {
    if (!isMobile && typeof window !== 'undefined') {
      const savedState = localStorage.getItem('ecodeli-sidebar-collapsed')
      if (savedState !== null) {
        setSidebarCollapsed(savedState === 'true')
      }
    }
  }, [isMobile])

  // Gestion des notifications
  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  // Mise à jour automatique des breadcrumbs basée sur la route
  useEffect(() => {
    const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
      const segments = pathname.split('/').filter(Boolean)
      const breadcrumbItems: BreadcrumbItem[] = []
      
      // Ignorer la locale dans l'URL
      const pathSegments = segments[0]?.match(/^(fr|en)$/) ? segments.slice(1) : segments
      
      // Ajouter l'accueil
      breadcrumbItems.push({
        label: 'Accueil',
        href: '/',
        isActive: pathSegments.length === 0
      })
      
      // Générer les breadcrumbs pour chaque segment
      let currentPath = ''
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`
        const isLast = index === pathSegments.length - 1
        
        // Transformer le segment en label lisible
        const label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        
        breadcrumbItems.push({
          label,
          href: isLast ? undefined : currentPath,
          isActive: isLast
        })
      })
      
      return breadcrumbItems
    }
    
    setBreadcrumbs(generateBreadcrumbs(pathname))
  }, [pathname])

  const contextValue: LayoutContextType = {
    // Thème
    theme,
    setTheme,
    
    // Langue
    locale,
    setLocale,
    
    // Sidebar
    sidebarCollapsed,
    toggleSidebar,
    
    // Notifications
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    
    // Breadcrumbs
    breadcrumbs,
    setBreadcrumbs,
    
    // Mobile
    isMobile,
    mobileMenuOpen,
    setMobileMenuOpen
  }

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  )
}

// Hook pour utiliser le contexte
export function useLayout(): LayoutContextType {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

// Hook pour la sidebar
export function useSidebar() {
  const { sidebarCollapsed, toggleSidebar, isMobile } = useLayout()
  
  return {
    collapsed: sidebarCollapsed,
    toggle: toggleSidebar,
    isMobile,
    // Utilitaires
    isExpanded: !sidebarCollapsed,
    shouldShowOverlay: isMobile && !sidebarCollapsed
  }
}

// Hook pour les breadcrumbs
export function useBreadcrumbs() {
  const { breadcrumbs, setBreadcrumbs } = useLayout()
  
  const updateBreadcrumbs = (newBreadcrumbs: BreadcrumbItem[]) => {
    setBreadcrumbs(newBreadcrumbs)
  }
  
  const addBreadcrumb = (breadcrumb: BreadcrumbItem) => {
    setBreadcrumbs(prev => [...prev, breadcrumb])
  }
  
  return {
    breadcrumbs,
    setBreadcrumbs: updateBreadcrumbs,
    addBreadcrumb
  }
}

// Hook pour les notifications
export function useNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useLayout()
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    hasUnread: unreadCount > 0
  }
}

// Hook pour le thème
export function useTheme() {
  const { theme, setTheme } = useLayout()
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }
  
  const setSystemTheme = () => {
    setTheme('system')
  }
  
  return {
    theme,
    setTheme,
    toggleTheme,
    setSystemTheme,
    isDark: theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches),
    isLight: theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && !window.matchMedia('(prefers-color-scheme: dark)').matches),
    isSystem: theme === 'system'
  }
}