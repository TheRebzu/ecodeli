import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session || session.user.role !== 'MERCHANT') {
    redirect('/login')
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
    <DashboardLayout
      user={session.user}
      navigationItems={navigationItems}
      title="Espace Commerçant"
    >
      {children}
    </DashboardLayout>
  )
} 