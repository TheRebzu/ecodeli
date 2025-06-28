import { useState, useEffect } from 'react'

export interface ClientService {
  id: string
  name: string
  description: string
  category: string
  pricePerHour: number
  duration: number
  isActive: boolean
  provider: {
    id: string
    name: string
    businessName?: string
    rating: number
    completedBookings: number
    location: string
    phone?: string
    avatar?: string
  }
}

export interface ServiceBooking {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduledAt: string
  duration: number
  totalPrice: number
  address: string
  phone: string
  notes?: string
  rating?: number
  review?: string
  createdAt: string
  service: {
    id: string
    name: string
    category: string
    pricePerHour: number
  }
  provider: {
    id: string
    name: string
    businessName?: string
    rating: number
    phone?: string
    avatar?: string
  }
}

export interface BookingRequest {
  serviceId: string
  providerId: string
  scheduledAt: string
  duration: number
  address: string
  phone: string
  notes?: string
}

export function useClientServices() {
  const [services, setServices] = useState<ClientService[]>([])
  const [bookings, setBookings] = useState<ServiceBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchServices(),
        fetchBookings()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/client/services')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des services')
      }

      const data = await response.json()
      setServices(data.services || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      throw error
    }
  }

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/client/bookings?type=service')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des réservations')
      }

      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      throw error
    }
  }

  const createBooking = async (bookingData: BookingRequest) => {
    try {
      const response = await fetch('/api/client/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingData,
          serviceType: 'PERSONAL_SERVICE'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création de la réservation')
      }

      const result = await response.json()
      await fetchBookings() // Recharger les réservations
      return result
    } catch (error) {
      throw error
    }
  }

  const cancelBooking = async (bookingId: string, reason: string) => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'annulation')
      }

      await fetchBookings() // Recharger les réservations
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const rateBooking = async (bookingId: string, rating: number, review?: string) => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'évaluation')
      }

      await fetchBookings() // Recharger les réservations
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const getAvailableSlots = async (providerId: string, date: string) => {
    try {
      const response = await fetch(`/api/client/bookings/available-slots?providerId=${providerId}&date=${date}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des créneaux')
      }

      const data = await response.json()
      return data.slots || []
    } catch (error) {
      console.error('Error fetching available slots:', error)
      throw error
    }
  }

  return {
    services,
    bookings,
    isLoading,
    error,
    fetchData,
    createBooking,
    cancelBooking,
    rateBooking,
    getAvailableSlots
  }
}