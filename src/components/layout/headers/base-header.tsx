/**
 * Header de base pour tous les types de headers EcoDeli
 * Fournit la structure commune et les fonctionnalités partagées
 */

import { type ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayout } from "../providers/layout-provider";
import { NotificationBell } from "@/components/ui/notification-bell";
import { UserMenu } from "@/components/ui/user-menu";
import { SearchBar } from "@/components/ui/search-bar";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { type BaseHeaderProps } from "../types/layout.types";

interface BaseHeaderLayoutProps extends BaseHeaderProps {
  children?: ReactNode;
  logo?: ReactNode;
  navigation?: ReactNode;
  actions?: ReactNode;
  className?: string;
  sticky?: boolean;
  border?: boolean;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export function BaseHeader({
  user,
  notifications = [],
  quickActions = [],
  onNotificationClick,
  onQuickActionClick,
  onUserMenuClick,
  children,
  logo,
  navigation,
  actions,
  className,
  sticky = true,
  border = true,
  showMobileMenu = false,
  onMobileMenuToggle,
}: BaseHeaderLayoutProps) {
  const { isMobile, mobileMenuOpen, setMobileMenuOpen } = useLayout();

  const handleMobileMenuToggle = () => {
    if (onMobileMenuToggle) {
      onMobileMenuToggle();
    } else {
      setMobileMenuOpen(!mobileMenuOpen);
    }
  };

  return (
    <header
      className={cn(
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        sticky && "sticky top-0 z-50",
        border && "border-b border-border",
        className,
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Section gauche - Logo et navigation */}
          <div className="flex items-center space-x-4">
            {/* Menu mobile */}
            {(showMobileMenu || isMobile) && (
              <button
                type="button"
                onClick={handleMobileMenuToggle}
                className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Menu principal"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}

            {/* Logo */}
            <div className="flex-shrink-0">{logo || <DefaultLogo />}</div>

            {/* Navigation desktop */}
            {navigation && <nav className="hidden lg:block">{navigation}</nav>}
          </div>

          {/* Section centrale - Contenu custom */}
          {children && (
            <div className="flex-1 flex justify-center px-4">{children}</div>
          )}

          {/* Section droite - Actions et utilisateur */}
          <div className="flex items-center space-x-2">
            {/* Actions personnalisées */}
            {actions}

            {/* Notifications */}
            {notifications.length > 0 && (
              <NotificationBell
                notifications={notifications}
                onNotificationClick={onNotificationClick || (() => {})}
                onMarkAllRead={() => {}}
                className="hidden sm:flex"
              />
            )}

            {/* Menu utilisateur */}
            {user && (
              <UserMenu
                user={user}
                onAction={onUserMenuClick || (() => {})}
                quickActions={quickActions}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Logo par défaut EcoDeli
 */
function DefaultLogo() {
  return (
    <Link href="/" className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">E</span>
      </div>
      <span className="font-bold text-xl text-foreground hidden sm:block">
        EcoDeli
      </span>
    </Link>
  );
}

/**
 * Header simple avec logo seul
 */
export function SimpleHeader({
  logo,
  className,
  ...props
}: Omit<BaseHeaderLayoutProps, "navigation" | "actions" | "children">) {
  return <BaseHeader logo={logo} className={className} {...props} />;
}

/**
 * Header avec recherche
 */
export function SearchHeader({
  searchPlaceholder = "Rechercher...",
  onSearchChange,
  onSearchSubmit,
  searchValue,
  className,
  ...props
}: BaseHeaderLayoutProps & {
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  searchValue?: string;
}) {
  return (
    <BaseHeader className={className} {...props}>
      <div className="max-w-md w-full">
        <SearchBar
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={onSearchChange || (() => {})}
          onSubmit={onSearchSubmit}
        />
      </div>
    </BaseHeader>
  );
}

/**
 * Header avec actions rapides
 */
export function ActionHeader({
  primaryAction,
  secondaryActions = [],
  className,
  ...props
}: BaseHeaderLayoutProps & {
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
}) {
  return (
    <BaseHeader
      className={className}
      actions={
        <div className="flex items-center space-x-2">
          {secondaryActions.map((action, index) => (
            <div key={index}>{action}</div>
          ))}
          {primaryAction && <div className="ml-2">{primaryAction}</div>}
        </div>
      }
      {...props}
    />
  );
}

/**
 * Header public avec authentification
 */
export function PublicHeaderBase({
  showAuth = true,
  showLanguage = true,
  showTheme = true,
  authActions,
  className,
  ...props
}: BaseHeaderLayoutProps & {
  showAuth?: boolean;
  showLanguage?: boolean;
  showTheme?: boolean;
  authActions?: ReactNode;
}) {
  return (
    <BaseHeader
      className={className}
      actions={
        <div className="flex items-center space-x-2">
          {showTheme && <ThemeToggle variant="icon-only" />}
          {showLanguage && <LanguageSwitcher variant="minimal" />}
          {showAuth &&
            (authActions || (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Inscription
                </Link>
              </div>
            ))}
        </div>
      }
      {...props}
    />
  );
}

/**
 * Header dashboard avec sidebar toggle
 */
export function DashboardHeaderBase({
  onSidebarToggle,
  showSidebar = true,
  className,
  ...props
}: BaseHeaderLayoutProps & {
  onSidebarToggle?: () => void;
  showSidebar?: boolean;
}) {
  const { toggleSidebar } = useLayout();

  const handleSidebarToggle = () => {
    if (onSidebarToggle) {
      onSidebarToggle();
    } else {
      toggleSidebar();
    }
  };

  return (
    <BaseHeader
      className={className}
      showMobileMenu={showSidebar}
      onMobileMenuToggle={handleSidebarToggle}
      {...props}
    />
  );
}
