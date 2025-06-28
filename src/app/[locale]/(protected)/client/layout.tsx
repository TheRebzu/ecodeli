"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { ClientHeader } from '@/components/layout/client-header'
import { ClientSidebar } from '@/components/layout/sidebars/client-sidebar'
// Tutorial overlay temporairement désactivé
import { useClientTutorial } from '@/features/client/hooks/useClientData'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { user, isLoading, isAuthenticated, signOut } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Tutorial state
  const {
    tutorial,
    loading: tutorialLoading,
    error: tutorialError,
    updateTutorialStep,
    completeTutorial,
    fetchTutorial
  } = useClientTutorial()
  
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialCompleted, setTutorialCompleted] = useState(false)

  // Check if tutorial is required on component mount
  useEffect(() => {
    if (user && !tutorialLoading && !tutorial) {
      fetchTutorial().catch(err => {
        console.error('Error fetching tutorial:', err)
      })
    }
  }, [user, tutorialLoading, tutorial])
  
  useEffect(() => {
    if (user && tutorial && !tutorialLoading && !tutorialCompleted) {
      // Show tutorial if user hasn't completed it yet
      setShowTutorial(!tutorial.completed)
    }
  }, [user, tutorial, tutorialLoading, tutorialCompleted])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [mobileMenuOpen])

  // Tutorial handlers - Version simplifiée

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // Simulated notification count (replace with real data)
  const notificationCount = 3

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null // Redirect handled by auth guard
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <ClientSidebar 
          collapsed={sidebarCollapsed}
          user={user}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-background">
            <ClientSidebar 
              collapsed={false}
              user={user}
            />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <ClientHeader
          user={{
            id: user.id,
            name: user.name || '',
            email: user.email,
            avatar: '', // Avatar will be loaded from profile
            subscription: 'FREE' // Default subscription
          }}
          onLogout={handleLogout}
          onMenuToggle={toggleMobileMenu}
          notificationCount={notificationCount}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Tutorial Overlay - Version simplifiée */}
      {showTutorial && tutorial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Bienvenue sur EcoDeli !</h2>
              <p className="text-gray-600 mb-6">
                Votre tutoriel sera activé dans une future version. 
                En attendant, explorez librement la plateforme.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    completeTutorial().then(() => {
                      setTutorialCompleted(true)
                      setShowTutorial(false)
                    }).catch(console.error)
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Commencer
                </button>
                <button
                  onClick={() => {
                    setTutorialCompleted(true)
                    setShowTutorial(false)
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}