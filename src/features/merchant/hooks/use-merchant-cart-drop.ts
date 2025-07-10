import { useState, useEffect } from 'react'
import { 
  CartDropConfiguration, 
  OrderSummary, 
  CartDropStats,
  DeliveryZone,
  TimeSlot 
} from '../services/cart-drop.service'

interface UseMerchantCartDropReturn {
  // Configuration
  config: CartDropConfiguration | null
  configLoading: boolean
  configError: string | null
  
  // Commandes
  orders: OrderSummary[]
  ordersLoading: boolean
  ordersError: string | null
  totalPages: number
  currentPage: number
  
  // Statistiques
  stats: CartDropStats | null
  statsLoading: boolean
  statsError: string | null
  
  // Actions
  updateConfiguration: (config: CartDropConfiguration) => Promise<boolean>
  createOrder: (orderData: {
    clientEmail: string
    deliveryAddress: string
    scheduledDate: Date
    items: { name: string; quantity: number; unitPrice: number }[]
    notes?: string
  }) => Promise<boolean>
  updateOrderStatus: (orderId: string, status: string) => Promise<boolean>
  loadOrders: (filters?: {
    status?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  }) => void
  refreshData: () => void
  checkSlotAvailability: (scheduledDate: Date) => Promise<boolean>
  calculateDeliveryFee: (postalCode: string) => number
}

export function useMerchantCartDrop(): UseMerchantCartDropReturn {
  // États de configuration
  const [config, setConfig] = useState<CartDropConfiguration | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  
  // États des commandes
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  
  // États des statistiques
  const [stats, setStats] = useState<CartDropStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Charger la configuration
  const loadConfiguration = async () => {
    try {
      setConfigLoading(true)
      setConfigError(null)
      
      const response = await fetch('/api/merchant/cart-drop/config')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la configuration')
      }
      
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setConfigLoading(false)
    }
  }

  // Charger les commandes
  const loadOrders = async (filters: {
    status?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    limit?: number
  } = {}) => {
    try {
      setOrdersLoading(true)
      setOrdersError(null)
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      
      const response = await fetch(`/api/merchant/cart-drop/orders?${params}`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes')
      }
      
      const data = await response.json()
      setOrders(data.orders)
      setTotalPages(data.totalPages)
      setCurrentPage(data.currentPage)
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setOrdersLoading(false)
    }
  }

  // Charger les statistiques
  const loadStats = async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      
      const response = await fetch('/api/merchant/cart-drop/stats')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setStatsLoading(false)
    }
  }

  // Mettre à jour la configuration
  const updateConfiguration = async (newConfig: CartDropConfiguration): Promise<boolean> => {
    try {
      const response = await fetch('/api/merchant/cart-drop/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la configuration')
      }
      
      // Rafraîchir la configuration
      await loadConfiguration()
      
      return true
    } catch (error) {
      console.error('Erreur mise à jour configuration:', error)
      return false
    }
  }

  // Créer une commande
  const createOrder = async (orderData: {
    clientEmail: string
    deliveryAddress: string
    scheduledDate: Date
    items: { name: string; quantity: number; unitPrice: number }[]
    notes?: string
  }): Promise<boolean> => {
    try {
      const response = await fetch('/api/merchant/cart-drop/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...orderData,
          scheduledDate: orderData.scheduledDate.toISOString()
        })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la commande')
      }
      
      // Rafraîchir les données
      await Promise.all([loadOrders(), loadStats()])
      
      return true
    } catch (error) {
      console.error('Erreur création commande:', error)
      return false
    }
  }

  // Mettre à jour le statut d'une commande
  const updateOrderStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/merchant/cart-drop/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut')
      }
      
      // Rafraîchir les données
      await Promise.all([loadOrders(), loadStats()])
      
      return true
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      return false
    }
  }

  // Vérifier la disponibilité d'un créneau
  const checkSlotAvailability = async (scheduledDate: Date): Promise<boolean> => {
    try {
      const response = await fetch(`/api/merchant/cart-drop/availability?date=${scheduledDate.toISOString()}`)
      if (!response.ok) {
        return false
      }
      
      const data = await response.json()
      return data.available
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error)
      return false
    }
  }

  // Calculer les frais de livraison
  const calculateDeliveryFee = (postalCode: string): number => {
    if (!config?.deliveryZones) {
      return 5.00 // Frais par défaut
    }

    const zone = config.deliveryZones.find(z => z.postalCode === postalCode && z.isActive)
    return zone ? zone.deliveryFee : 8.00 // Frais pour zone non couverte
  }

  // Fonction de refresh générale
  const refreshData = () => {
    loadConfiguration()
    loadOrders()
    loadStats()
  }

  // Chargement initial
  useEffect(() => {
    loadConfiguration()
    loadOrders()
    loadStats()
  }, [])

  return {
    // Configuration
    config,
    configLoading,
    configError,
    
    // Commandes
    orders,
    ordersLoading,
    ordersError,
    totalPages,
    currentPage,
    
    // Statistiques
    stats,
    statsLoading,
    statsError,
    
    // Actions
    updateConfiguration,
    createOrder,
    updateOrderStatus,
    loadOrders,
    refreshData,
    checkSlotAvailability,
    calculateDeliveryFee
  }
}

// Hook pour gérer les zones de livraison
export function useDeliveryZones(initialZones: DeliveryZone[] = []) {
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones)

  const addZone = (zone: DeliveryZone) => {
    setZones(prev => [...prev, zone])
  }

  const updateZone = (index: number, updatedZone: DeliveryZone) => {
    setZones(prev => prev.map((zone, i) => i === index ? updatedZone : zone))
  }

  const removeZone = (index: number) => {
    setZones(prev => prev.filter((_, i) => i !== index))
  }

  const toggleZoneStatus = (index: number) => {
    setZones(prev => prev.map((zone, i) => 
      i === index ? { ...zone, isActive: !zone.isActive } : zone
    ))
  }

  return {
    zones,
    setZones,
    addZone,
    updateZone,
    removeZone,
    toggleZoneStatus
  }
}

// Hook pour gérer les créneaux horaires
export function useTimeSlots(initialSlots: TimeSlot[] = []) {
  const [slots, setSlots] = useState<TimeSlot[]>(initialSlots)

  const addSlot = (slot: TimeSlot) => {
    setSlots(prev => [...prev, slot])
  }

  const updateSlot = (index: number, updatedSlot: TimeSlot) => {
    setSlots(prev => prev.map((slot, i) => i === index ? updatedSlot : slot))
  }

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index))
  }

  const toggleSlotStatus = (index: number) => {
    setSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, isActive: !slot.isActive } : slot
    ))
  }

  const getActiveSlots = () => {
    return slots.filter(slot => slot.isActive)
  }

  const getSlotsByDay = (day: string) => {
    return slots.filter(slot => slot.day === day && slot.isActive)
  }

  return {
    slots,
    setSlots,
    addSlot,
    updateSlot,
    removeSlot,
    toggleSlotStatus,
    getActiveSlots,
    getSlotsByDay
  }
} 