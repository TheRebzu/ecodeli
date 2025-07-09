import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ProductList } from '@/features/merchant/components/products/ProductList'
import { PageHeader } from '@/components/layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function MerchantProductsListPage() {
  const t = await getTranslations('merchant.products')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <ProductList />
      </Suspense>
    </div>
  )
} 