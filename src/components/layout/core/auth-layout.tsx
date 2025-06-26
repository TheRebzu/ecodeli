/**
 * Layout pour les pages d'authentification
 * Design moderne et responsive pour login, register, forgot-password, etc.
 */

import { type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { BaseLayout } from './base-layout'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { type AuthLayoutProps } from '../types/layout.types'

export function AuthLayout({
  children,
  user,
  loading,
  error,
  title = "EcoDeli",
  subtitle = "Plateforme de crowdshipping éco-responsable",
  showLanguageSwitcher = true,
  showThemeToggle = true
}: AuthLayoutProps) {
  return (
    <BaseLayout 
      user={user} 
      loading={loading} 
      error={error}
      className="bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      <div className="min-h-screen flex">
        {/* Section gauche - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 to-blue-600 relative overflow-hidden">
          {/* Pattern de fond */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:20px_20px]" />
          </div>
          
          <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
            {/* Logo principal */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <span className="text-3xl font-bold text-white">E</span>
              </div>
            </div>
            
            {/* Titre et description */}
            <div className="text-center space-y-4 max-w-md">
              <h1 className="text-4xl font-bold">{title}</h1>
              <p className="text-xl text-white/90 leading-relaxed">
                {subtitle}
              </p>
            </div>
            
            {/* Features highlights */}
            <div className="mt-12 space-y-4 max-w-sm">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full" />
                <span className="text-white/90">Livraisons éco-responsables</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full" />
                <span className="text-white/90">Services à la personne</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-white rounded-full" />
                <span className="text-white/90">Stockage intelligent</span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold">1000+</div>
                <div className="text-sm text-white/70">Utilisateurs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">50+</div>
                <div className="text-sm text-white/70">Villes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">6</div>
                <div className="text-sm text-white/70">Entrepôts</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Section droite - Formulaire */}
        <div className="w-full lg:w-1/2 flex flex-col">
          {/* Header avec actions */}
          <div className="flex justify-between items-center p-6 lg:p-8">
            {/* Logo mobile */}
            <Link href="/" className="lg:hidden">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">E</span>
              </div>
            </Link>
            
            {/* Spacer pour desktop */}
            <div className="hidden lg:block" />
            
            {/* Actions */}
            <div className="flex items-center space-x-3">
              {showThemeToggle && <ThemeToggle />}
              {showLanguageSwitcher && <LanguageSwitcher />}
            </div>
          </div>
          
          {/* Contenu principal */}
          <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
            <div className="w-full max-w-md space-y-8">
              {/* Header mobile */}
              <div className="lg:hidden text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                <p className="text-muted-foreground">{subtitle}</p>
              </div>
              
              {/* Contenu du formulaire */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                {children}
              </div>
              
              {/* Footer */}
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Confidentialité
                  </Link>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    CGU
                  </Link>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <Link href="/support" className="hover:text-foreground transition-colors">
                    Support
                  </Link>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  © 2024 EcoDeli. Tous droits réservés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}

/**
 * Variante simplifiée pour les pages comme forgot-password
 */
export function SimpleAuthLayout({
  children,
  title,
  showBackButton = true,
  backHref = "/login"
}: {
  children: ReactNode
  title?: string
  showBackButton?: boolean
  backHref?: string
}) {
  return (
    <BaseLayout className="bg-gray-50 dark:bg-gray-900">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Link href="/">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">E</span>
              </div>
            </Link>
            
            {title && (
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            )}
          </div>
          
          {/* Contenu */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            {children}
          </div>
          
          {/* Navigation */}
          {showBackButton && (
            <div className="text-center">
              <Link 
                href={backHref}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center space-x-1"
              >
                <span>←</span>
                <span>Retour à la connexion</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  )
}