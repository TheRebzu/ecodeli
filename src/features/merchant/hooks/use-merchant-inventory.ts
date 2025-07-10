import { useState, useEffect, useCallback } from 'react'
import { 
  Product, 
  StockMovement, 
  InventoryAlert,
  InventoryStats,
  Category
} from '../services/inventory.service'

interface UseInventoryState {
  products: Product[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    totalPages: number
    total: number
  }
  filters: {
    category?: string
    status?: string
    search?: string
    lowStock?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
}

interface UseInventoryActions {
  loadProducts: () => Promise<void>
  setFilters: (filters: Partial<UseInventoryState['filters']>) => void
  setPage: (page: number) => void
  createProduct: (productData: any) => Promise<Product>
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<Product>
  deleteProduct: (productId: string) => Promise<void>
  addStockMovement: (productId: string, movement: any) => Promise<StockMovement>
  refreshProduct: (productId: string) => Promise<Product | null>
}

export interface UseInventoryReturn extends UseInventoryState, UseInventoryActions {}

/**
 * Hook principal pour la gestion d'inventaire
 */
export function useMerchantInventory(merchantId: string): UseInventoryReturn {
  const [state, setState] = useState<UseInventoryState>({
    products: [],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      totalPages: 0,
      total: 0
    },
    filters: {}
  })

  /**
   * Charge les produits avec les filtres actuels
   */
  const loadProducts = useCallback(async () => {
    if (!merchantId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/merchant/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          filters: {
            ...state.filters,
            page: state.pagination.page,
            limit: state.pagination.limit
          }
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des produits')
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        products: data.products,
        pagination: {
          ...prev.pagination,
          totalPages: data.pagination.totalPages,
          total: data.total
        },
        isLoading: false
      }))

    } catch (error) {
      console.error('Erreur chargement produits:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }, [merchantId, state.filters, state.pagination.page, state.pagination.limit])

  /**
   * Met à jour les filtres
   */
  const setFilters = useCallback((newFilters: Partial<UseInventoryState['filters']>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, page: 1 } // Reset page
    }))
  }, [])

  /**
   * Change de page
   */
  const setPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }))
  }, [])

  /**
   * Crée un nouveau produit
   */
  const createProduct = useCallback(async (productData: any): Promise<Product> => {
    try {
      const response = await fetch('/api/merchant/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          productData
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la création du produit')
      }

      const product = await response.json()
      
      // Recharger la liste
      await loadProducts()
      
      return product

    } catch (error) {
      console.error('Erreur création produit:', error)
      throw error
    }
  }, [merchantId, loadProducts])

  /**
   * Met à jour un produit
   */
  const updateProduct = useCallback(async (productId: string, updates: Partial<Product>): Promise<Product> => {
    try {
      const response = await fetch(`/api/merchant/inventory/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          updates
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du produit')
      }

      const product = await response.json()
      
      // Mettre à jour le produit dans la liste
      setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === productId ? product : p)
      }))
      
      return product

    } catch (error) {
      console.error('Erreur mise à jour produit:', error)
      throw error
    }
  }, [merchantId])

  /**
   * Supprime un produit
   */
  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/merchant/inventory/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du produit')
      }

      // Retirer le produit de la liste
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== productId)
      }))

    } catch (error) {
      console.error('Erreur suppression produit:', error)
      throw error
    }
  }, [merchantId])

  /**
   * Ajoute un mouvement de stock
   */
  const addStockMovement = useCallback(async (productId: string, movement: any): Promise<StockMovement> => {
    try {
      const response = await fetch(`/api/merchant/inventory/products/${productId}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          movement
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors du mouvement de stock')
      }

      const stockMovement = await response.json()
      
      // Recharger les produits pour mettre à jour les stocks
      await loadProducts()
      
      return stockMovement

    } catch (error) {
      console.error('Erreur mouvement stock:', error)
      throw error
    }
  }, [merchantId, loadProducts])

  /**
   * Rafraîchit un produit spécifique
   */
  const refreshProduct = useCallback(async (productId: string): Promise<Product | null> => {
    try {
      const response = await fetch(`/api/merchant/inventory/products/${productId}?merchantId=${merchantId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du rafraîchissement du produit')
      }

      const product = await response.json()
      
      // Mettre à jour le produit dans la liste
      setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === productId ? product : p)
      }))
      
      return product

    } catch (error) {
      console.error('Erreur rafraîchissement produit:', error)
      return null
    }
  }, [merchantId])

  // Charger les produits au montage et quand les filtres changent
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return {
    ...state,
    loadProducts,
    setFilters,
    setPage,
    createProduct,
    updateProduct,
    deleteProduct,
    addStockMovement,
    refreshProduct
  }
}

/**
 * Hook pour un produit spécifique
 */
export function useProduct(productId: string, merchantId: string) {
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProduct = useCallback(async () => {
    if (!productId || !merchantId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/merchant/inventory/products/${productId}?merchantId=${merchantId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du produit')
      }

      const data = await response.json()
      setProduct(data)

    } catch (error) {
      console.error('Erreur chargement produit:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [productId, merchantId])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  return {
    product,
    isLoading,
    error,
    refresh: fetchProduct
  }
}

/**
 * Hook pour les mouvements de stock
 */
export function useStockMovements(productId: string) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })

  const fetchMovements = useCallback(async () => {
    if (!productId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/merchant/inventory/products/${productId}/movements?page=${pagination.page}&limit=${pagination.limit}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des mouvements')
      }

      const data = await response.json()
      setMovements(data.movements)
      setPagination(prev => ({ ...prev, total: data.total }))

    } catch (error) {
      console.error('Erreur chargement mouvements:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [productId, pagination.page, pagination.limit])

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  return {
    movements,
    isLoading,
    error,
    pagination,
    setPage,
    refresh: fetchMovements
  }
}

/**
 * Hook pour les statistiques d'inventaire
 */
export function useInventoryStats(merchantId: string) {
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!merchantId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/merchant/inventory/stats?merchantId=${merchantId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }

      const data = await response.json()
      setStats(data)

    } catch (error) {
      console.error('Erreur chargement stats:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [merchantId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats
  }
}

/**
 * Hook pour les alertes d'inventaire
 */
export function useInventoryAlerts(merchantId: string) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAlerts = useCallback(async () => {
    if (!merchantId) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/merchant/inventory/alerts?merchantId=${merchantId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des alertes')
      }

      const data = await response.json()
      setAlerts(data)

    } catch (error) {
      console.error('Erreur chargement alertes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [merchantId])

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/merchant/inventory/alerts/${alertId}/read`, {
        method: 'PATCH'
      })

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, isRead: true }
            : alert
        )
      )
    } catch (error) {
      console.error('Erreur marquage alerte:', error)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  return {
    alerts,
    isLoading,
    refresh: fetchAlerts,
    markAsRead,
    unreadCount: alerts.filter(alert => !alert.isRead).length,
    criticalCount: alerts.filter(alert => alert.severity === 'CRITICAL').length
  }
}

/**
 * Hook pour les catégories
 */
export function useCategories(merchantId: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!merchantId) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/merchant/inventory/categories?merchantId=${merchantId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des catégories')
      }

      const data = await response.json()
      setCategories(data)

    } catch (error) {
      console.error('Erreur chargement catégories:', error)
    } finally {
      setIsLoading(false)
    }
  }, [merchantId])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    isLoading,
    refresh: fetchCategories
  }
} 