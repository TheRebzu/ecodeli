"use client"

import { useState, useEffect } from 'react'

interface ClientStats {
  totalAnnouncements: number
  activeDeliveries: number
  completedDeliveries: number
  totalSpent: number
  savedAmount: number
  averageRating: number
  storageBoxes: number
  pendingPayments: number
}

interface RecentAnnouncement {
  id: string
  title: string
  type: string
  status: string
  price: number
  createdAt: string
  interestedDeliverers?: number
  pickupDate?: string
  delivererName?: string
  estimatedCompletion?: string
  completedAt?: string
  rating?: number
}

interface ActiveService {
  id: string
  providerName: string
  serviceType: string
  nextAppointment: string
  status: string
  price: number
  frequency: string
}

interface StorageBox {
  id: string
  location: string
  size: string
  status: string
  rentedUntil: string
  monthlyPrice: number
  accessCode: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  timestamp: string
  read: boolean
}

interface ClientDashboardData {
  stats: ClientStats
  recentAnnouncements: RecentAnnouncement[]
  activeServices: ActiveService[]
  storageBoxes: StorageBox[]
  notifications: Notification[]
  isLoading: boolean
  error: string | null
}

export function useClientDashboard(): ClientDashboardData {
  const [data, setData] = useState<ClientDashboardData>({
    stats: {
      totalAnnouncements: 0,
      activeDeliveries: 0,
      completedDeliveries: 0,
      totalSpent: 0,
      savedAmount: 0,
      averageRating: 0,
      storageBoxes: 0,
      pendingPayments: 0
    },
    recentAnnouncements: [],
    activeServices: [],
    storageBoxes: [],
    notifications: [],
    isLoading: true,
    error: null
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/client/dashboard')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Accès non autorisé')
        }
        throw new Error('Erreur lors du chargement du dashboard')
      }

      const dashboardData = await response.json()
      
      // Adapter les données de l'API vers la structure attendue par le composant
      setData({
        stats: {
          totalAnnouncements: dashboardData.stats?.totalAnnouncements || 0,
          activeDeliveries: dashboardData.stats?.activeDeliveries || 0,
          completedDeliveries: dashboardData.stats?.completedDeliveries || 0,
          totalSpent: dashboardData.stats?.totalSpent || 0,
          savedAmount: dashboardData.stats?.subscriptionSavings || 0,
          averageRating: dashboardData.stats?.averageRating || 0,
          storageBoxes: dashboardData.stats?.storageBoxesActive || 0,
          pendingPayments: 0
        },
        recentAnnouncements: (dashboardData.recentAnnouncements || []).map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          type: ann.type,
          status: ann.status,
          price: ann.price,
          createdAt: ann.createdAt,
          interestedDeliverers: ann.interestedDeliverers,
          delivererName: ann.deliverer?.name,
          estimatedCompletion: ann.estimatedDelivery,
          rating: ann.rating
        })),
        activeServices: (dashboardData.recentBookings || []).map((booking: any) => ({
          id: booking.id,
          providerName: booking.provider?.name || 'Prestataire',
          serviceType: booking.serviceType,
          nextAppointment: booking.scheduledDate,
          status: booking.status,
          price: booking.totalPrice,
          frequency: 'Ponctuel'
        })),
        storageBoxes: (dashboardData.activeStorageBoxes || []).map((box: any) => ({
          id: box.id,
          location: `${box.warehouse?.name || ''} - ${box.warehouse?.address || ''}`,
          size: box.size,
          status: 'ACTIVE',
          rentedUntil: box.endDate,
          monthlyPrice: box.monthlyPrice,
          accessCode: box.accessCode
        })),
        notifications: (dashboardData.notifications || []).map((notif: any) => ({
          id: notif.id,
          type: notif.category || 'info',
          title: notif.title,
          message: notif.message,
          timestamp: notif.createdAt,
          read: notif.read
        })),
        isLoading: false,
        error: null
      })
    } catch (error) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }

  return data
}