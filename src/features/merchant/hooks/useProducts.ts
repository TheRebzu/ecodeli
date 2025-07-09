'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

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

interface ProductStats {
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  totalCategories: number
}

interface UseProductsReturn {
  products: Product[]
  stats: ProductStats | null
  isLoading: boolean
  error: string | null
  createProduct: (data: Partial<Product>) => Promise<void>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  bulkImport: (file: File) => Promise<void>
}

export function useProducts(): UseProductsReturn {
  const t = useTranslations('merchant.products')
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/merchant/products')
      if (!response.ok) {
        throw new Error(t('error.fetchFailed'))
      }
      
      const data = await response.json()
      setProducts(data.products || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  const createProduct = async (data: Partial<Product>) => {
    try {
      const response = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error(t('error.createFailed'))
      }
      
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'))
      throw err
    }
  }

  const updateProduct = async (id: string, data: Partial<Product>) => {
    try {
      const response = await fetch(`/api/merchant/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        throw new Error(t('error.updateFailed'))
      }
      
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'))
      throw err
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(`/api/merchant/products/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error(t('error.deleteFailed'))
      }
      
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'))
      throw err
    }
  }

  const bulkImport = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/merchant/products/bulk-import', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(t('error.importFailed'))
      }
      
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'))
      throw err
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return {
    products,
    stats,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkImport,
  }
} 