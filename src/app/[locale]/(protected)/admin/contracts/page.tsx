import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/auth'
import { ContractManagement } from '@/features/admin/components/contracts/contract-management'

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.admin.contracts' })
  
  return {
    title: t('title'),
    description: t('description')
  }
}

export default async function ContractsPage({
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

  return <ContractManagement />
}