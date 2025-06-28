import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/auth'
import { MonthlyBillingDashboard } from '@/features/admin/components/billing/monthly-billing-dashboard'

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.admin.billing' })
  
  return {
    title: 'Facturation Mensuelle - Admin EcoDeli',
    description: 'Gestion de la facturation automatique mensuelle des prestataires'
  }
}

export default async function MonthlyBillingPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const session = await auth.api.getSession({
    headers: await import('next/headers').then(mod => mod.headers())
  })

  if (!session?.user || session.user.role !== USER_ROLES.ADMIN) {
    redirect(`/${locale}/login`)
  }

  return <MonthlyBillingDashboard />
}