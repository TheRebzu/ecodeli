import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ProductsOverview } from '@/features/merchant/components/products/ProductsOverview'
import { PageHeader } from '@/components/layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function MerchantProductsPage() {
  const t = await getTranslations('merchant.products')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <ProductsOverview />
      </Suspense>
    </div>
  )
} 