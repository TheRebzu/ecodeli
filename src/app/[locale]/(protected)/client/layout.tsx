"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { ClientHeader } from '@/components/layout/headers/client-header'
import { ClientSidebar } from '@/components/layout/sidebars/client-sidebar'
import { TutorialManager } from '@/features/tutorials/components/tutorial-manager'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { user, isLoading, isAuthenticated, signOut } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  // Mock notifications for demo
  const mockNotifications = [
    {
      id: '1',
      title: 'Nouvelle livraison',
      message: 'Votre colis a été pris en charge par un livreur',
      type: 'info' as const,
      read: false,
      createdAt: new Date()
    },
    {
      id: '2',
      title: 'Paiement effectué',
      message: 'Votre paiement de 25€ a été confirmé',
      type: 'success' as const,
      read: false,
      createdAt: new Date()
    },
    {
      id: '3',
      title: 'Service réservé',
      message: 'Votre réservation de ménage est confirmée',
      type: 'info' as const,
      read: true,
      createdAt: new Date()
    }
  ]

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null // Redirect handled by auth guard
  }

  return (
    <TutorialManager autoStart={true}>
      <div className="flex h-screen bg-background dark:bg-background">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden md:flex transition-all duration-300 ease-in-out border-r border-border",
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
            <aside className="absolute left-0 top-0 h-full w-64 bg-background border-r border-border">
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
              role: user.role,
              subscription: (user.subscription as 'FREE' | 'STARTER' | 'PREMIUM') || 'FREE',
              avatar: user.avatar || ''
            }}
            onSidebarToggle={toggleMobileMenu}
            notifications={mockNotifications}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-background dark:bg-background">
            <div className="p-6">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </TutorialManager>
  )
}