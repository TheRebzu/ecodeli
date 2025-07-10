import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/auth'
import { DeliveryValidationPage } from '@/features/deliverer/components/deliveries/delivery-validation-page'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.deliverer.validation' })
  
  return {
    title: t('title'),
    description: t('description')
  }
}

export default async function ValidateDeliveryPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const session = await auth.api.getSession({
    headers: await import('next/headers').then(mod => mod.headers())
  })

  if (!session?.user || session.user.role !== USER_ROLES.DELIVERER) {
    redirect(`/${locale}/login`)
  }

  return <DeliveryValidationPage deliveryId={id} />
}