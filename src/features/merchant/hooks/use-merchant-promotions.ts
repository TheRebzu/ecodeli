import { useState, useEffect, useCallback } from 'react'
import { 
  Promotion, 
  PromotionStats,
  CampaignTemplate,
  PromotionUsage
} from '../services/promotions.service'

interface UsePromotionsState {
  promotions: Promotion[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    totalPages: number
    total: number
  }
  filters: {
    status?: string
    type?: string
    search?: string
    active?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
}

interface UsePromotionsActions {
  loadPromotions: () => Promise<void>
  setFilters: (filters: Partial<UsePromotionsState['filters']>) => void
  setPage: (page: number) => void
  createPromotion: (promotionData: any) => Promise<Promotion>
  updatePromotion: (promotionId: string, updates: Partial<Promotion>) => Promise<Promotion>
  deletePromotion: (promotionId: string) => Promise<void>
  togglePromotionStatus: (promotionId: string, status: 'ACTIVE' | 'PAUSED') => Promise<Promotion>
  validatePromotionCode: (code: string, orderId: string) => Promise<any>
  duplicatePromotion: (promotionId: string) => Promise<Promotion>
}

export interface UsePromotionsReturn extends UsePromotionsState, UsePromotionsActions {}

/**
 * Hook principal pour la gestion des promotions
 */
export function useMerchantPromotions(merchantId: string): UsePromotionsReturn {
  const [state, setState] = useState<UsePromotionsState>({
    promotions: [],
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
   * Charge les promotions avec les filtres actuels
   */
  const loadPromotions = useCallback(async () => {
    if (!merchantId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/merchant/promotions', {
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
        throw new Error('Erreur lors du chargement des promotions')
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        promotions: data.promotions,
        pagination: {
          ...prev.pagination,
          totalPages: data.pagination.totalPages,
          total: data.total
        },
        isLoading: false
      }))

    } catch (error) {
      console.error('Erreur chargement promotions:', error)
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
  const setFilters = useCallback((newFilters: Partial<UsePromotionsState['filters']>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      pagination: { ...prev.pagination, page: 1 }
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
   * Crée une nouvelle promotion
   */
  const createPromotion = useCallback(async (promotionData: any): Promise<Promotion> => {
    try {
      const response = await fetch('/api/merchant/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          promotionData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création de la promotion')
      }

      const promotion = await response.json()
      
      // Recharger la liste
      await loadPromotions()
      
      return promotion

    } catch (error) {
      console.error('Erreur création promotion:', error)
      throw error
    }
  }, [merchantId, loadPromotions])

  /**
   * Met à jour une promotion
   */
  const updatePromotion = useCallback(async (promotionId: string, updates: Partial<Promotion>): Promise<Promotion> => {
    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}`, {
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la mise à jour de la promotion')
      }

      const promotion = await response.json()
      
      // Mettre à jour la promotion dans la liste
      setState(prev => ({
        ...prev,
        promotions: prev.promotions.map(p => p.id === promotionId ? promotion : p)
      }))
      
      return promotion

    } catch (error) {
      console.error('Erreur mise à jour promotion:', error)
      throw error
    }
  }, [merchantId])

  /**
   * Supprime une promotion
   */
  const deletePromotion = useCallback(async (promotionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la suppression de la promotion')
      }

      // Retirer la promotion de la liste
      setState(prev => ({
        ...prev,
        promotions: prev.promotions.filter(p => p.id !== promotionId)
      }))

    } catch (error) {
      console.error('Erreur suppression promotion:', error)
      throw error
    }
  }, [merchantId])

  /**
   * Active/désactive une promotion
   */
  const togglePromotionStatus = useCallback(async (promotionId: string, status: 'ACTIVE' | 'PAUSED'): Promise<Promotion> => {
    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du changement de statut')
      }

      const promotion = await response.json()
      
      // Mettre à jour la promotion dans la liste
      setState(prev => ({
        ...prev,
        promotions: prev.promotions.map(p => p.id === promotionId ? promotion : p)
      }))
      
      return promotion

    } catch (error) {
      console.error('Erreur changement statut:', error)
      throw error
    }
  }, [merchantId])

  /**
   * Valide un code promo pour une commande
   */
  const validatePromotionCode = useCallback(async (code: string, orderId: string): Promise<any> => {
    try {
      const response = await fetch('/api/merchant/promotions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          orderId,
          merchantId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la validation')
      }

      return await response.json()

    } catch (error) {
      console.error('Erreur validation code promo:', error)
      throw error
    }
  }, [merchantId])

  /**
   * Duplique une promotion existante
   */
  const duplicatePromotion = useCallback(async (promotionId: string): Promise<Promotion> => {
    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la duplication')
      }

      const promotion = await response.json()
      
      // Recharger la liste
      await loadPromotions()
      
      return promotion

    } catch (error) {
      console.error('Erreur duplication promotion:', error)
      throw error
    }
  }, [merchantId, loadPromotions])

  // Charger les promotions au montage et quand les filtres changent
  useEffect(() => {
    loadPromotions()
  }, [loadPromotions])

  return {
    ...state,
    loadPromotions,
    setFilters,
    setPage,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus,
    validatePromotionCode,
    duplicatePromotion
  }
}

/**
 * Hook pour une promotion spécifique
 */
export function usePromotion(promotionId: string, merchantId: string) {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPromotion = useCallback(async () => {
    if (!promotionId || !merchantId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}?merchantId=${merchantId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la promotion')
      }

      const data = await response.json()
      setPromotion(data)

    } catch (error) {
      console.error('Erreur chargement promotion:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [promotionId, merchantId])

  useEffect(() => {
    fetchPromotion()
  }, [fetchPromotion])

  return {
    promotion,
    isLoading,
    error,
    refresh: fetchPromotion
  }
}

/**
 * Hook pour les statistiques des promotions
 */
export function usePromotionStats(merchantId: string, period?: string) {
  const [stats, setStats] = useState<PromotionStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!merchantId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/merchant/promotions/stats?merchantId=${merchantId}&period=${period || '30d'}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }

      const data = await response.json()
      setStats(data)

    } catch (error) {
      console.error('Erreur chargement stats promotions:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [merchantId, period])

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
 * Hook pour les templates de campagnes
 */
export function useCampaignTemplates() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/merchant/promotions/templates')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des templates')
      }

      const data = await response.json()
      setTemplates(data)

    } catch (error) {
      console.error('Erreur chargement templates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createFromTemplate = useCallback(async (templateId: string, customData: any) => {
    try {
      const response = await fetch('/api/merchant/promotions/from-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId,
          customData
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la création depuis le template')
      }

      return await response.json()

    } catch (error) {
      console.error('Erreur création depuis template:', error)
      throw error
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    isLoading,
    refresh: fetchTemplates,
    createFromTemplate
  }
}

/**
 * Hook pour l'historique d'utilisation des promotions
 */
export function usePromotionUsage(promotionId: string) {
  const [usages, setUsages] = useState<PromotionUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })

  const fetchUsages = useCallback(async () => {
    if (!promotionId) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/merchant/promotions/${promotionId}/usage?page=${pagination.page}&limit=${pagination.limit}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique')
      }

      const data = await response.json()
      setUsages(data.usages)
      setPagination(prev => ({ ...prev, total: data.total }))

    } catch (error) {
      console.error('Erreur chargement historique:', error)
    } finally {
      setIsLoading(false)
    }
  }, [promotionId, pagination.page, pagination.limit])

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  useEffect(() => {
    fetchUsages()
  }, [fetchUsages])

  return {
    usages,
    isLoading,
    pagination,
    setPage,
    refresh: fetchUsages
  }
}

/**
 * Hook pour la validation en temps réel des codes promo
 */
export function usePromotionValidator() {
  const [validationState, setValidationState] = useState<{
    isValidating: boolean
    result: any
    error: string | null
  }>({
    isValidating: false,
    result: null,
    error: null
  })

  const validateCode = useCallback(async (code: string, orderData: any) => {
    if (!code.trim()) {
      setValidationState({
        isValidating: false,
        result: null,
        error: null
      })
      return
    }

    setValidationState(prev => ({
      ...prev,
      isValidating: true,
      error: null
    }))

    try {
      const response = await fetch('/api/merchant/promotions/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          orderData
        })
      })

      const result = await response.json()

      setValidationState({
        isValidating: false,
        result: result.valid ? result : null,
        error: result.valid ? null : result.error
      })

    } catch (error) {
      setValidationState({
        isValidating: false,
        result: null,
        error: 'Erreur lors de la validation'
      })
    }
  }, [])

  const clearValidation = useCallback(() => {
    setValidationState({
      isValidating: false,
      result: null,
      error: null
    })
  }, [])

  return {
    ...validationState,
    validateCode,
    clearValidation
  }
} 