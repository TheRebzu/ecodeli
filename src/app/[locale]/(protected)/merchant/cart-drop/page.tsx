import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CartDropOverview } from '@/features/merchant/components/cart-drop/CartDropOverview'
import { PageHeader } from '@/components/layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function MerchantCartDropPage() {
  const t = await getTranslations('merchant.cartDrop')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <CartDropOverview />
      </Suspense>
    </div>
  )
} 