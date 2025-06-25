'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && (!user || user.role !== 'MERCHANT')) {
      router.push('/login')
    }
  }, [user, loading, router])
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>
  }
  
  if (!user || user.role !== 'MERCHANT') {
    return null
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/merchant',
      icon: '🏠'
    },
    {
      name: 'Mes annonces',
      href: '/merchant/announcements',
      icon: '📦'
    },
    {
      name: 'Lâcher de chariot',
      href: '/merchant/cart-drop',
      icon: '🛒'
    },
    {
      name: 'Contrat',
      href: '/merchant/contract',
      icon: '📄'
    },
    {
      name: 'Facturation',
      href: '/merchant/billing',
      icon: '💳'
    },
    {
      name: 'Paramètres',
      href: '/merchant/settings',
      icon: '⚙️'
    }
  ]

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
} 