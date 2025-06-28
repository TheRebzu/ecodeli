/**
 * Header public EcoDeli - Version refactorisée
 * Pour les utilisateurs non connectés et les pages publiques
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Package, Truck, Users, Store, Home, Phone, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PublicHeaderBase } from './base-header'
import { MobileMenu } from '@/components/ui/mobile-menu'
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { type PublicHeaderProps, type NavigationItem } from '../types/layout.types'

// Configuration de navigation publique
const getPublicNavigation = (t: any): NavigationItem[] => [
  {
    key: 'services',
    label: t('services'),
    href: '/services',
    children: [
      {
        key: 'delivery',
        label: t('delivery'),
        href: '/services/delivery',
        icon: 'Truck'
      },
      {
        key: 'personal-services',
        label: t('personal_services'),
        href: '/services/personal',
        icon: 'Users'
      },
      {
        key: 'storage',
        label: t('storage'),
        href: '/services/storage',
        icon: 'Package'
      }
    ]
  },
  {
    key: 'partners',
    label: t('partners'),
    href: '/partners',
    children: [
      {
        key: 'merchants',
        label: t('merchants'),
        href: '/partners/merchants',
        icon: 'Store'
      },
      {
        key: 'providers',
        label: t('providers'),
        href: '/partners/providers',
        icon: 'Users'
      }
    ]
  },
  {
    key: 'pricing',
    label: t('pricing'),
    href: '/pricing'
  },
  {
    key: 'about',
    label: t('about'),
    href: '/about'
  },
  {
    key: 'contact',
    label: t('contact'),
    href: '/contact'
  }
]

export function PublicHeader({
  showAuth = true,
  showLanguageSwitcher = true,
  showThemeToggle = true,
  className
}: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = useTranslations('navigation')
  const common = useTranslations('common')
  
  const navigationItems = getPublicNavigation(t)

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Truck, Users, Package, Store, Home, Phone
    }
    const IconComponent = icons[iconName]
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null
  }

  // Logo EcoDeli
  const logo = (
    <Link href="/home" className="flex items-center space-x-2 group">
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <div className="absolute -inset-1 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg opacity-20 group-hover:opacity-30 transition-opacity -z-10" />
      </div>
      <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors hidden sm:block">
        EcoDeli
      </span>
    </Link>
  )

  // Navigation principale
  const navigation = (
    <NavigationMenu>
      <NavigationMenuList>
        {navigationItems.map((item) => (
          <NavigationMenuItem key={item.key}>
            {item.children ? (
              <>
                <NavigationMenuTrigger className="text-sm font-medium">
                  {item.label}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4">
                    <div className="grid grid-cols-1 gap-2">
                      {item.children.map((child) => (
                        <NavigationMenuLink key={child.key} asChild>
                          <Link
                            href={child.href}
                            className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg transition-colors group"
                          >
                            <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                              {getIcon(child.icon || 'Package')}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{child.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {child.key === 'delivery' && 'Livraisons écologiques'}
                                {child.key === 'personal-services' && 'Services à domicile'}
                                {child.key === 'storage' && 'Stockage intelligent'}
                                {child.key === 'merchants' && 'Rejoignez notre réseau'}
                                {child.key === 'providers' && 'Proposez vos services'}
                              </div>
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                    
                    {/* CTA dans le dropdown */}
                    {item.key === 'services' && (
                      <div className="border-t border-border pt-3 mt-2">
                        <Link
                          href="/register"
                          className="flex items-center justify-center w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          Commencer maintenant
                        </Link>
                      </div>
                    )}
                  </div>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink asChild>
                <Link
                  href={item.href}
                  className="text-sm font-medium px-3 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )

  // Actions d'authentification
  const authActions = (
    <div className="flex items-center space-x-2">
      <Button variant="ghost" asChild className="hidden sm:inline-flex">
        <Link href="/login">{common('login')}</Link>
      </Button>
      <Button asChild className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
        <Link href="/register">{common('register')}</Link>
      </Button>
    </div>
  )

  return (
    <>
      <PublicHeaderBase
        logo={logo}
        navigation={navigation}
        showAuth={showAuth}
        showLanguage={showLanguageSwitcher}
        showTheme={showThemeToggle}
        authActions={authActions}
        className={cn(
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          "border-b border-border/50",
          className
        )}
        showMobileMenu={true}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Menu mobile */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navigationItems={navigationItems}
      />
    </>
  )
}

/**
 * Version simplifiée pour les pages d'erreur, maintenance, etc.
 */
export function SimplePublicHeader({
  showBackButton = false,
  backHref = "/",
  className
}: {
  showBackButton?: boolean
  backHref?: string
  className?: string
}) {
  const logo = (
    <Link href="/" className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">E</span>
      </div>
      <span className="text-xl font-bold text-foreground">EcoDeli</span>
    </Link>
  )

  const actions = (
    <div className="flex items-center space-x-2">
      {showBackButton && (
        <Button variant="ghost" asChild>
          <Link href={backHref}>← Retour</Link>
        </Button>
      )}
    </div>
  )

  return (
    <PublicHeaderBase
      logo={logo}
      actions={actions}
      showAuth={false}
      showLanguage={false}
      showTheme={false}
      className={cn("border-b border-border", className)}
      sticky={false}
    />
  )
}

/**
 * Header avec bandeau d'annonce
 */
export function PublicHeaderWithBanner({
  bannerText = "🎉 Nouvelle fonctionnalité : Stockage intelligent disponible !",
  bannerHref = "/services/storage",
  showBanner = true,
  ...props
}: PublicHeaderProps & {
  bannerText?: string
  bannerHref?: string
  showBanner?: boolean
}) {
  const [bannerVisible, setBannerVisible] = useState(showBanner)

  return (
    <>
      {bannerVisible && (
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white text-center py-2 relative">
          <Link
            href={bannerHref}
            className="text-sm font-medium hover:underline"
          >
            {bannerText}
          </Link>
          <button
            onClick={() => setBannerVisible(false)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:bg-white/20 rounded p-1 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <PublicHeader {...props} />
    </>
  )
}