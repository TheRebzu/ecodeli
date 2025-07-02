"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { DelivererHeader } from '@/components/layout/deliverer-header'
import { DelivererSidebar } from '@/components/layout/sidebars/deliverer-sidebar'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

interface DelivererLayoutProps {
  children: React.ReactNode
}

export default function DelivererLayout({ children }: DelivererLayoutProps) {
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  // TODO: Get real data from API
  const activeDeliveries = 0
  const pendingRequests = 0

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
        <DelivererSidebar 
          collapsed={sidebarCollapsed}
          user={user}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-background">
            <DelivererSidebar 
              collapsed={false}
              user={user}
            />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <DelivererHeader
          user={{
            name: user.name || '',
            email: user.email,
            rating: undefined, // TODO: Get from API
            isVerified: undefined // TODO: Get from API
          }}
          onLogout={handleLogout}
          activeDeliveries={activeDeliveries}
          pendingRequests={pendingRequests}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}
