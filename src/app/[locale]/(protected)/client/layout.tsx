"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
// Importer notre authentification simple quand disponible

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const t = useTranslations('common')
  // Temporaire : pas d'authentification pour l'instant
  const user = { email: "client@test.com", name: "Client Test" }
  const isAuthenticated = true

  useEffect(() => {
    // Simulation d'une vérification d'auth simple pour l'instant
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [isLoading, router])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      
      // Déconnexion simple avec fetch
      await fetch('/api/auth/simple-logout', { method: 'POST' })
      
      // Redirection manuelle après déconnexion
      router.push('/fr/login')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      // En cas d'erreur, rediriger quand même
      router.push('/fr/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  // Si pas authentifié, ne pas afficher le layout
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec vraies données utilisateur */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">EcoDeli</span>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-sm text-gray-600">
                  {user.name || user.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoggingOut && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {isLoggingOut ? 'Déconnexion...' : t('logout')}
              </button>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
} 