import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session || session.user.role !== 'PROVIDER') {
    redirect('/login')
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