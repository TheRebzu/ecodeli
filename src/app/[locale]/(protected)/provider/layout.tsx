'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && (!user || user.role !== 'PROVIDER')) {
      router.push('/login')
    }
  }, [user, loading, router])
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>
  }
  
  if (!user || user.role !== 'PROVIDER') {
    return null
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/provider',
      icon: '🏠'
    },
    {
      name: 'Mes services',
      href: '/provider/services',
      icon: '🛠️'
    },
    {
      name: 'Calendrier',
      href: '/provider/calendar',
      icon: '📅'
    },
    {
      name: 'Réservations',
      href: '/provider/bookings',
      icon: '📋'
    },
    {
      name: 'Factures',
      href: '/provider/invoices',
      icon: '💰'
    },
    {
      name: 'Certifications',
      href: '/provider/certifications',
      icon: '📄'
    },
    {
      name: 'Paramètres',
      href: '/provider/settings',
      icon: '⚙️'
    }
  ]

  return (
    <DashboardLayout
      user={session.user}
      navigationItems={navigationItems}
      title="Espace Prestataire"
    >
      {children}
    </DashboardLayout>
  )
} 