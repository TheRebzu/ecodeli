'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Tag
} from 'lucide-react'
import Link from 'next/link'
import { Label } from '@/components/ui/label'

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

interface ProductDetailProps {
  productId: string
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const t = useTranslations('merchant.products')
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/merchant/products/${productId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }

        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium">Product not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {error || 'The product you are looking for does not exist.'}
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/merchant/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/merchant/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('detail.back')}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">{t('detail.description')}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/merchant/products/${product.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            {t('detail.edit')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.images')}</CardTitle>
          </CardHeader>
          <CardContent>
            {product.images && product.images.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Information */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('detail.price')}</Label>
                  <div className="text-2xl font-bold">€{product.price.toFixed(2)}</div>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="text-sm text-muted-foreground line-through">
                      €{product.originalPrice.toFixed(2)}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('detail.status')}</Label>
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? t('detail.active') : t('detail.inactive')}
                  </Badge>
                </div>
              </div>

              {product.description && (
                <div>
                  <Label className="text-sm font-medium">{t('detail.description')}</Label>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {product.sku && (
                  <div>
                    <Label className="text-sm font-medium">{t('detail.sku')}</Label>
                    <Badge variant="outline">{product.sku}</Badge>
                  </div>
                )}
                {product.brand && (
                  <div>
                    <Label className="text-sm font-medium">{t('detail.brand')}</Label>
                    <p className="text-sm">{product.brand}</p>
                  </div>
                )}
              </div>

              {product.category && (
                <div>
                  <Label className="text-sm font-medium">{t('detail.category')}</Label>
                  <p className="text-sm">{product.category}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.inventory')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('detail.stockQuantity')}</Label>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-bold ${
                      product.stockQuantity <= product.minStockAlert ? 'text-red-600' : ''
                    }`}>
                      {product.stockQuantity}
                    </span>
                    {product.stockQuantity <= product.minStockAlert && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('detail.minStockAlert')}</Label>
                  <p className="text-lg font-bold">{product.minStockAlert}</p>
                </div>
              </div>

              {product.weight && (
                <div>
                  <Label className="text-sm font-medium">{t('detail.weight')}</Label>
                  <p className="text-sm">{product.weight} kg</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  {t('detail.tags')}
                </CardTitle>
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
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.metadata')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-sm font-medium">{t('detail.createdAt')}</Label>
              <p className="text-muted-foreground">
                {new Date(product.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">{t('detail.updatedAt')}</Label>
              <p className="text-muted-foreground">
                {new Date(product.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 