'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Package, Edit, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react'

interface ProductDetailProps {
  productId: string
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  sku?: string
  category?: string
  brand?: string
  weight?: number
  dimensions?: any
  images: string[]
  isActive: boolean
  stockQuantity: number
  minStockAlert: number
  tags: string[]
  metadata?: any
  createdAt: string
  updatedAt: string
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const t = useTranslations('merchant.products')
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/merchant/products/${productId}`)
        if (!response.ok) {
          throw new Error(t('error.fetchFailed'))
        }
        
        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error.unknown'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [productId, t])

  const handleDelete = async () => {
    if (!product || !confirm(t('actions.confirmDelete'))) return

    try {
      const response = await fetch(`/api/merchant/products/${productId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error(t('error.deleteFailed'))
      }
      
      router.push('/merchant/products')
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !product) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error || t('error.notFound')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('actions.back')}
        </Button>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/merchant/products/${productId}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t('actions.edit')}
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('actions.delete')}
          </Button>
        </div>
      </div>

      {/* Product Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>{t('detail.basicInfo')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">{product.name}</h3>
              {product.description && (
                <p className="text-muted-foreground mt-1">{product.description}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('detail.sku')}</span>
                <span className="font-medium">{product.sku || '-'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('detail.category')}</span>
                <span className="font-medium">{product.category || '-'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('detail.brand')}</span>
                <span className="font-medium">{product.brand || '-'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('detail.weight')}</span>
                <span className="font-medium">
                  {product.weight ? `${product.weight} kg` : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing and Stock */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.pricingStock')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('detail.price')}</span>
                <span className="font-medium text-lg">{product.price.toFixed(2)}€</span>
              </div>
              
              {product.originalPrice && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('detail.originalPrice')}</span>
                  <span className="font-medium line-through text-muted-foreground">
                    {product.originalPrice.toFixed(2)}€
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('detail.stockQuantity')}</span>
                <span className="font-medium">{product.stockQuantity}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('detail.minStockAlert')}</span>
                <span className="font-medium">{product.minStockAlert}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={product.isActive ? 'default' : 'secondary'}>
                {product.isActive ? t('status.active') : t('status.inactive')}
              </Badge>
              
              {product.stockQuantity <= product.minStockAlert && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t('detail.lowStock')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {product.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.tags')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images */}
      {product.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.images')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <div key={index} className="aspect-square">
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {product.metadata && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.metadata')}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(product.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.timestamps')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('detail.createdAt')}</span>
              <span className="font-medium">
                {new Date(product.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('detail.updatedAt')}</span>
              <span className="font-medium">
                {new Date(product.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 