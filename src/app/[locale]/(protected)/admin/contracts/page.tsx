import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { USER_ROLES } from '@/lib/auth/utils'
import { ContractManagement } from '@/features/admin/components/contracts/contract-management'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pages.admin.contracts' })
  
  return {
    title: t('title'),
    description: t('description')
  }
}

export default async function ContractsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()

  if (!session?.user || session.user.role !== USER_ROLES.ADMIN) {
    redirect(`/${locale}/login`)
  }

  return <ContractManagement />
}