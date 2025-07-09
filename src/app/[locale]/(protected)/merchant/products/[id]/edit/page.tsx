import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ProductEditForm } from '@/features/merchant/components/products/ProductEditForm'
import { PageHeader } from '@/components/layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProductEditPageProps {
  params: {
    id: string
  }
}

export default async function MerchantEditProductPage({ params }: ProductEditPageProps) {
  const t = await getTranslations('merchant.products')

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('edit.title')}
        description={t('edit.description')}
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <ProductEditForm productId={params.id} />
      </Suspense>
    </div>
  )
} 