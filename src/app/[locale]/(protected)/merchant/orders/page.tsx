import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { OrdersOverview } from '@/features/merchant/components/orders/OrdersOverview'
import { PageHeader } from '@/components/layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function MerchantOrdersPage() {
  const t = await getTranslations('merchant.orders')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <OrdersOverview />
      </Suspense>
    </div>
  )
} 