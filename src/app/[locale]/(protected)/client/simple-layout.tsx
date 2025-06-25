"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/lib/auth-client-simple"

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function SimpleClientLayout({ children }: ClientLayoutProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const t = useTranslations('common')
  const { user, loading, signOut } = useAuth()

  useEffect(() => {
    // Rediriger si pas connecté et chargement terminé
    if (!loading && !user) {
      router.push('/fr/login')
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      // La redirection est gérée par le hook signOut
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      // Forcer la redirection en cas d'erreur
      router.push('/fr/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Si pas authentifié, ne pas afficher le layout
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec données utilisateur */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-green-600">EcoDeli</span>
              <span className="text-sm text-gray-500">
                [{user.role}]
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoggingOut && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
} 