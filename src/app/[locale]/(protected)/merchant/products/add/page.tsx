import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ProductForm } from '@/features/merchant/components/products/ProductForm'
import { PageHeader } from '@/components/layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default async function MerchantAddProductPage() {
  const t = await getTranslations('merchant.products')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('add.title')}
        description={t('add.description')}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <ProductForm />
      </Suspense>
    </div>
  )
} 