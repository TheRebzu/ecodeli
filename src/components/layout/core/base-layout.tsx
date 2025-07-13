/**
 * Layout de base pour l'application EcoDeli
 * Composant racine qui fournit les fonctionnalités communes
 */

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LayoutProvider } from "../providers/layout-provider";
import { type BaseLayoutProps, type ThemeMode } from "../types/layout.types";

interface BaseLayoutRootProps extends BaseLayoutProps {
  className?: string;
  withProvider?: boolean;
  initialTheme?: ThemeMode;
  initialLocale?: string;
}

export function BaseLayout({
  children,
  user,
  loading = false,
  error,
  className,
  withProvider = true,
  initialTheme = "system",
  initialLocale = "fr",
}: BaseLayoutRootProps) {
  // Gestion des états de chargement et d'erreur
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">
            Une erreur s'est produite
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  const content = (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground",
        "selection:bg-primary/20 selection:text-primary-foreground",
        className,
      )}
    >
      {children}
    </div>
  );

  // Wrapper avec provider si nécessaire
  if (withProvider) {
    return (
      <LayoutProvider initialTheme={initialTheme} initialLocale={initialLocale}>
        {content}
      </LayoutProvider>
    );
  }

  return content;
}

/**
 * Composant de layout d'erreur global
 */
export function ErrorLayout({
  error,
  reset,
  title = "Une erreur s'est produite",
  showResetButton = true,
}: {
  error: string;
  reset?: () => void;
  title?: string;
  showResetButton?: boolean;
}) {
  return (
    <BaseLayout withProvider={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-lg">
          <div className="text-red-500 text-8xl">💥</div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground text-lg">
              Nous nous excusons pour ce désagrément. Notre équipe a été
              notifiée.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg text-left">
            <p className="text-sm text-muted-foreground font-mono">{error}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showResetButton && reset && (
              <button
                onClick={reset}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Réessayer
              </button>
            )}

            <button
              onClick={() => (window.location.href = "/")}
              className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
            >
              Retour à l'accueil
            </button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Si le problème persiste, contactez notre support à{" "}
              <a
                href="mailto:support@ecodeli.com"
                className="text-primary hover:underline font-medium"
              >
                support@ecodeli.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}

/**
 * Composant de layout de chargement global
 */
export function LoadingLayout({
  message = "Chargement...",
  showProgress = false,
  progress = 0,
}: {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}) {
  return (
    <BaseLayout withProvider={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="relative">
            <div className="animate-spin h-16 w-16 border-4 border-primary/30 border-t-primary rounded-full mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 bg-primary rounded-full animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">{message}</p>

            {showProgress && (
              <div className="space-y-1">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>

          <div className="animate-pulse">
            <div className="flex justify-center space-x-1">
              <div
                className="h-2 w-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-2 w-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-2 w-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}

/**
 * Composant de layout vide (maintenance, construction, etc.)
 */
export function EmptyLayout({
  icon = "🚧",
  title = "Page en construction",
  message = "Cette page sera bientôt disponible.",
  showBackButton = true,
}: {
  icon?: string;
  title?: string;
  message?: string;
  showBackButton?: boolean;
}) {
  return (
    <BaseLayout withProvider={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-8xl">{icon}</div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground text-lg">{message}</p>
          </div>

          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Retour
            </button>
          )}
        </div>
      </div>
    </BaseLayout>
  );
}
