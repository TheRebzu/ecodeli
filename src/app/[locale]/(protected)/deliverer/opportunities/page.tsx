import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/auth'
import { DelivererOpportunitiesPage } from '@/features/deliverer/components/opportunities/DelivererOpportunitiesPage'

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.deliverer.opportunities' })
  
  return {
    title: t('title'),
    description: t('description')
  }
}

export default async function OpportunitiesPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const session = await auth.api.getSession({
    headers: await import('next/headers').then(mod => mod.headers())
  })

  if (!session?.user || session.user.role !== USER_ROLES.DELIVERER) {
    redirect(`/${locale}/login`)
  }

  return <DelivererOpportunitiesPage />
}