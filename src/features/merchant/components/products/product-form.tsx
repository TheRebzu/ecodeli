'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useProducts } from '@/features/merchant/hooks/use-products'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  originalPrice: z.number().min(0).optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  weight: z.number().min(0).optional(),
  stockQuantity: z.number().min(0, 'Stock quantity must be positive'),
  minStockAlert: z.number().min(0, 'Minimum stock alert must be positive'),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
})

type ProductFormData = z.infer<typeof productSchema>

export function ProductForm() {
  const t = useTranslations('merchant.products')
  const router = useRouter()
  const { createProduct } = useProducts()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      isActive: true,
      stockQuantity: 0,
      minStockAlert: 5,
      tags: [],
    },
  })

  const watchedTags = watch('tags', [])

  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true)
      await createProduct({
        ...data,
        images,
        dimensions: null, // TODO: Add dimensions form
        metadata: null, // TODO: Add metadata form
      })
      router.push('/merchant/products')
    } catch (error) {
      console.error('Error creating product:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      // TODO: Implement actual image upload to server
      const newImages = Array.from(files).map(file => URL.createObjectURL(file))
      setImages(prev => [...prev, ...newImages])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue('tags', [...watchedTags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/merchant/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('form.back')}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('form.addTitle')}</h1>
            <p className="text-muted-foreground">{t('form.addDescription')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('form.basicInfo')}</CardTitle>
              <CardDescription>{t('form.basicInfoDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('form.name')} *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('form.namePlaceholder')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('form.description')}</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder={t('form.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{t('form.price')} *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register('price', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="text-sm text-red-600">{errors.price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice">{t('form.originalPrice')}</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    {...register('originalPrice', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">{t('form.sku')}</Label>
                  <Input
                    id="sku"
                    {...register('sku')}
                    placeholder={t('form.skuPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">{t('form.brand')}</Label>
                  <Input
                    id="brand"
                    {...register('brand')}
                    placeholder={t('form.brandPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t('form.category')}</Label>
                <Input
                  id="category"
                  {...register('category')}
                  placeholder={t('form.categoryPlaceholder')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory & Status */}
          <Card>
            <CardHeader>
              <CardTitle>{t('form.inventory')}</CardTitle>
              <CardDescription>{t('form.inventoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">{t('form.stockQuantity')} *</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    {...register('stockQuantity', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.stockQuantity && (
                    <p className="text-sm text-red-600">{errors.stockQuantity.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStockAlert">{t('form.minStockAlert')} *</Label>
                  <Input
                    id="minStockAlert"
                    type="number"
                    {...register('minStockAlert', { valueAsNumber: true })}
                    placeholder="5"
                  />
                  {errors.minStockAlert && (
                    <p className="text-sm text-red-600">{errors.minStockAlert.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">{t('form.weight')} (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={watch('isActive')}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
                <Label htmlFor="isActive">{t('form.isActive')}</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>{t('form.images')}</CardTitle>
            <CardDescription>{t('form.imagesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-2 border-dashed border-muted-foreground rounded-lg p-4 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">{t('form.uploadImage')}</p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>{t('form.tags')}</CardTitle>
            <CardDescription>{t('form.tagsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={t('form.tagPlaceholder')}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag}>
                {t('form.addTag')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchedTags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/merchant/products">
              {t('form.cancel')}
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? t('form.saving') : t('form.save')}
          </Button>
        </div>
      </form>
    </div>
  )
} 