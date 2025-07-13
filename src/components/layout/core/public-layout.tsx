/**
 * Layout public refactorisé pour EcoDeli
 * Pour les pages publiques (accueil, services, à propos, etc.)
 */

import { type ReactNode } from "react";
import { BaseLayout } from "./base-layout";
import { PublicHeader } from "../headers/public-header";
import { PublicFooter } from "../footers/public-footer";
import { cn } from "@/lib/utils";
import { type PublicLayoutProps } from "../types/layout.types";

export function PublicLayout({
  children,
  user,
  loading,
  error,
  showHeader = true,
  showFooter = true,
  fullWidth = false,
  className,
}: PublicLayoutProps) {
  return (
    <BaseLayout
      user={user}
      loading={loading}
      error={error}
      className={className}
    >
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        {showHeader && (
          <PublicHeader
            showAuth={!user}
            showLanguageSwitcher={true}
            showThemeToggle={true}
          />
        )}

        {/* Contenu principal */}
        <main
          className={cn("flex-1", !fullWidth && "container mx-auto px-4 py-8")}
        >
          {children}
        </main>

        {/* Footer */}
        {showFooter && (
          <PublicFooter
            variant="full"
            showSocial={true}
            showWarehouseInfo={true}
          />
        )}
      </div>
    </BaseLayout>
  );
}

/**
 * Layout public centré pour les pages de contenu
 */
export function CenteredPublicLayout({
  children,
  title,
  description,
  maxWidth = "4xl",
  showBackButton = false,
  backHref = "/",
  ...props
}: PublicLayoutProps & {
  title?: string;
  description?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl";
  showBackButton?: boolean;
  backHref?: string;
}) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
  };

  return (
    <PublicLayout {...props} fullWidth>
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <div className={cn("w-full mx-auto px-4", maxWidthClasses[maxWidth])}>
          {/* En-tête de page */}
          {(title || description || showBackButton) && (
            <div className="text-center mb-8">
              {showBackButton && (
                <div className="mb-4">
                  <button
                    onClick={() => (window.location.href = backHref)}
                    className="text-primary hover:text-primary/80 transition-colors text-sm flex items-center mx-auto"
                  >
                    ← Retour
                  </button>
                </div>
              )}

              {title && (
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  {title}
                </h1>
              )}

              {description && (
                <p className="text-lg text-muted-foreground">{description}</p>
              )}
            </div>
          )}

          {/* Contenu */}
          {children}
        </div>
      </div>
    </PublicLayout>
  );
}

/**
 * Layout pour les pages de contenu avec sidebar
 */
export function ContentPublicLayout({
  children,
  sidebar,
  sidebarPosition = "right",
  title,
  breadcrumbs,
  ...props
}: PublicLayoutProps & {
  sidebar?: ReactNode;
  sidebarPosition?: "left" | "right";
  title?: string;
  breadcrumbs?: ReactNode;
}) {
  return (
    <PublicLayout {...props} fullWidth>
      <div className="container mx-auto px-4 py-8">
        {/* Header de page */}
        {(title || breadcrumbs) && (
          <div className="mb-8">
            {breadcrumbs}
            {title && (
              <h1 className="text-3xl font-bold text-foreground mt-4">
                {title}
              </h1>
            )}
          </div>
        )}

        {/* Layout avec sidebar */}
        <div
          className={cn(
            "grid gap-8",
            sidebar
              ? sidebarPosition === "left"
                ? "lg:grid-cols-[300px_1fr]"
                : "lg:grid-cols-[1fr_300px]"
              : "lg:grid-cols-1",
          )}
        >
          {/* Sidebar gauche */}
          {sidebar && sidebarPosition === "left" && (
            <aside className="space-y-6">{sidebar}</aside>
          )}

          {/* Contenu principal */}
          <div className="min-w-0">{children}</div>

          {/* Sidebar droite */}
          {sidebar && sidebarPosition === "right" && (
            <aside className="space-y-6">{sidebar}</aside>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

/**
 * Layout pour les pages d'atterrissage
 */
export function LandingLayout({
  children,
  hero,
  showHeaderOverlay = false,
  ...props
}: PublicLayoutProps & {
  hero?: ReactNode;
  showHeaderOverlay?: boolean;
}) {
  return (
    <BaseLayout {...props}>
      <div className="min-h-screen">
        {/* Header avec overlay optionnel */}
        <div className={cn(showHeaderOverlay && "relative z-10")}>
          <PublicHeader
            className={cn(
              showHeaderOverlay &&
                "absolute top-0 w-full bg-transparent border-transparent",
            )}
          />
        </div>

        {/* Section hero */}
        {hero && (
          <section className={cn(showHeaderOverlay && "-mt-16 pt-16")}>
            {hero}
          </section>
        )}

        {/* Contenu principal */}
        <main>{children}</main>

        {/* Footer */}
        <PublicFooter />
      </div>
    </BaseLayout>
  );
}

/**
 * Layout minimal pour pages d'erreur, maintenance, etc.
 */
export function MinimalPublicLayout({
  children,
  showLogo = true,
  ...props
}: PublicLayoutProps & {
  showLogo?: boolean;
}) {
  return (
    <BaseLayout {...props} className="bg-gray-50 dark:bg-gray-900">
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {showLogo && (
          <div className="mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">E</span>
            </div>
          </div>
        )}

        <div className="w-full max-w-md text-center">{children}</div>
      </div>
    </BaseLayout>
  );
}
