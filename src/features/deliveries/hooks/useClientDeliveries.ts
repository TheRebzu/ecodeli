import { useState, useEffect } from 'react'

export interface ClientDelivery {
  id: string
  announcementId: string
  announcementTitle: string
  status: 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  delivererName?: string
  delivererPhone?: string
  delivererAvatar?: string
  pickupAddress: string
  deliveryAddress: string
  scheduledDate: string
  price: number
  validationCode?: string
  trackingUrl?: string
  estimatedDelivery?: string
  actualDelivery?: string
  rating?: number
  review?: string
  createdAt: string
}

export function useClientDeliveries() {
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDeliveries()
  }, [])

  const fetchDeliveries = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/client/deliveries')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des livraisons')
      }

      const data = await response.json()
      setDeliveries(data.deliveries || [])
    } catch (error) {
      console.error('Error fetching deliveries:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDelivery = async (deliveryId: string, validationCode: string) => {
    try {
      const response = await fetch(`/api/client/deliveries/${deliveryId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationCode })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur confirmation')
      }

      await fetchDeliveries() // Recharger les données
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const rateDelivery = async (deliveryId: string, rating: number, review?: string) => {
    try {
      const response = await fetch(`/api/client/deliveries/${deliveryId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur évaluation')
      }

      await fetchDeliveries() // Recharger les données
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const cancelDelivery = async (deliveryId: string, reason: string) => {
    try {
      const response = await fetch(`/api/client/deliveries/${deliveryId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur annulation')
      }

      await fetchDeliveries() // Recharger les données
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  return {
    deliveries,
    isLoading,
    error,
    fetchDeliveries,
    confirmDelivery,
    rateDelivery,
    cancelDelivery
  }
}