'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import type {
  ClientProfile,
  ClientDashboardStats,
  ClientAnnouncement,
  ClientBooking,
  StorageBox,
  ClientStorageRental,
  ClientPayment,
  DeliveryTracking,
  ServiceProvider,
  ClientTutorial,
  ClientSubscription
} from '../types'

export function useClientProfile() {
  const { data, loading, error, execute } = useApi<ClientProfile>()

  const fetchProfile = async () => {
    await execute('/api/client/profile')
  }

  const updateProfile = async (profileData: Partial<ClientProfile>) => {
    await execute('/api/client/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  }

  return {
    profile: data,
    loading,
    error,
    fetchProfile,
    updateProfile,
    refetch: fetchProfile
  }
}

export function useClientDashboard() {
  const { data, loading, error, execute } = useApi<ClientDashboardStats>()

  const fetchDashboard = async () => {
    await execute('/api/client/dashboard')
  }

  return {
    stats: data,
    loading,
    error,
    fetchDashboard,
    refetch: fetchDashboard
  }
}

export function useClientAnnouncements() {
  const { data, loading, error, execute } = useApi<{
    announcements: ClientAnnouncement[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>()

  const fetchAnnouncements = async (params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
    startDate?: string
    endDate?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/client/announcements?${searchParams.toString()}`)
  }

  const createAnnouncement = async (announcementData: any) => {
    await execute('/api/client/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData)
    })
  }

  const updateAnnouncement = async (announcementId: string, data: any) => {
    await execute(`/api/client/announcements/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  const cancelAnnouncement = async (announcementId: string) => {
    await execute(`/api/client/announcements/${announcementId}`, {
      method: 'DELETE'
    })
  }

  return {
    announcements: data?.announcements || [],
    pagination: data?.pagination,
    loading,
    error,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    cancelAnnouncement,
    refetch: fetchAnnouncements
  }
}

export function useClientBookings() {
  const { data, loading, error, execute } = useApi<{
    bookings: ClientBooking[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>()

  const fetchBookings = async (params?: {
    page?: number
    limit?: number
    status?: string
    category?: string
    startDate?: string
    endDate?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/client/bookings?${searchParams.toString()}`)
  }

  const createBooking = async (bookingData: any) => {
    await execute('/api/client/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    })
  }

  const updateBooking = async (bookingId: string, data: any) => {
    await execute(`/api/client/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  const cancelBooking = async (bookingId: string) => {
    await execute(`/api/client/bookings/${bookingId}/cancel`, {
      method: 'POST'
    })
  }

  const rateBooking = async (bookingId: string, rating: number, review?: string) => {
    await execute(`/api/client/bookings/${bookingId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, review })
    })
  }

  return {
    bookings: data?.bookings || [],
    pagination: data?.pagination,
    loading,
    error,
    fetchBookings,
    createBooking,
    updateBooking,
    cancelBooking,
    rateBooking,
    refetch: fetchBookings
  }
}

export function useStorageBoxes() {
  const { data, loading, error, execute } = useApi<{
    boxes: StorageBox[]
    rentals: ClientStorageRental[]
  }>()

  const fetchStorageBoxes = async (params?: {
    city?: string
    size?: string
    maxPrice?: number
    available?: boolean
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/client/storage-boxes?${searchParams.toString()}`)
  }

  const rentStorageBox = async (rentalData: any) => {
    await execute('/api/client/storage-boxes', {
      method: 'POST',
      body: JSON.stringify(rentalData)
    })
  }

  const updateRental = async (rentalId: string, data: any) => {
    await execute(`/api/client/storage-boxes/${rentalId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  const cancelRental = async (rentalId: string) => {
    await execute(`/api/client/storage-boxes/${rentalId}`, {
      method: 'DELETE'
    })
  }

  const addItemToStorage = async (rentalId: string, item: any) => {
    await execute(`/api/client/storage-boxes/${rentalId}/items`, {
      method: 'POST',
      body: JSON.stringify(item)
    })
  }

  const removeItemFromStorage = async (rentalId: string, itemId: string) => {
    await execute(`/api/client/storage-boxes/${rentalId}/items/${itemId}`, {
      method: 'DELETE'
    })
  }

  return {
    boxes: data?.boxes || [],
    rentals: data?.rentals || [],
    loading,
    error,
    fetchStorageBoxes,
    rentStorageBox,
    updateRental,
    cancelRental,
    addItemToStorage,
    removeItemFromStorage,
    refetch: fetchStorageBoxes
  }
}

export function useClientPayments() {
  const { data, loading, error, execute } = useApi<{
    payments: ClientPayment[]
    stats: {
      totalSpent: number
      monthlySpent: number
      savedWithDiscount: number
      averageOrderValue: number
    }
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>()

  const fetchPayments = async (params?: {
    page?: number
    limit?: number
    type?: string
    status?: string
    startDate?: string
    endDate?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/client/payments?${searchParams.toString()}`)
  }

  const downloadInvoice = async (paymentId: string) => {
    await execute(`/api/client/payments/${paymentId}/invoice`, {
      method: 'GET'
    })
  }

  return {
    payments: data?.payments || [],
    stats: data?.stats,
    pagination: data?.pagination,
    loading,
    error,
    fetchPayments,
    downloadInvoice,
    refetch: fetchPayments
  }
}

export function useDeliveryTracking() {
  const { data, loading, error, execute } = useApi<DeliveryTracking>()

  const fetchTracking = async (deliveryId: string) => {
    await execute(`/api/client/deliveries/${deliveryId}/tracking`)
  }

  const refreshTracking = async (deliveryId: string) => {
    await execute(`/api/client/deliveries/${deliveryId}/tracking`, {
      method: 'POST'
    })
  }

  return {
    tracking: data,
    loading,
    error,
    fetchTracking,
    refreshTracking,
    refetch: () => data && fetchTracking(data.delivery.id)
  }
}

export function useServiceProviders() {
  const { data, loading, error, execute } = useApi<{
    providers: ServiceProvider[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>()

  const fetchProviders = async (params?: {
    page?: number
    limit?: number
    category?: string
    city?: string
    minRating?: number
    available?: boolean
    date?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/client/services?${searchParams.toString()}`)
  }

  const getProviderDetails = async (providerId: string) => {
    await execute(`/api/client/services/${providerId}`)
  }

  const getProviderAvailability = async (providerId: string, date: string) => {
    await execute(`/api/client/services/${providerId}/availability?date=${date}`)
  }

  return {
    providers: data?.providers || [],
    pagination: data?.pagination,
    loading,
    error,
    fetchProviders,
    getProviderDetails,
    getProviderAvailability,
    refetch: fetchProviders
  }
}

export function useClientSubscription() {
  const { data, loading, error, execute } = useApi<ClientSubscription>()

  const fetchSubscription = async () => {
    await execute('/api/client/subscription')
  }

  const upgradeSubscription = async (subscriptionData: any) => {
    await execute('/api/client/subscription', {
      method: 'PUT',
      body: JSON.stringify(subscriptionData)
    })
  }

  const cancelSubscription = async () => {
    await execute('/api/client/subscription', {
      method: 'DELETE'
    })
  }

  const renewSubscription = async () => {
    await execute('/api/client/subscription/renew', {
      method: 'POST'
    })
  }

  return {
    subscription: data,
    loading,
    error,
    fetchSubscription,
    upgradeSubscription,
    cancelSubscription,
    renewSubscription,
    refetch: fetchSubscription
  }
}

export function useClientTutorial() {
  const { data, loading, error, execute } = useApi<ClientTutorial>()

  const fetchTutorial = async () => {
    await execute('/api/client/tutorial')
  }

  const updateTutorialStep = async (stepId: string, completed: boolean) => {
    await execute('/api/client/tutorial/step', {
      method: 'PUT',
      body: JSON.stringify({ stepId, completed })
    })
  }

  const completeTutorial = async () => {
    await execute('/api/client/tutorial/complete', {
      method: 'POST'
    })
  }

  const resetTutorial = async () => {
    await execute('/api/client/tutorial/reset', {
      method: 'POST'
    })
  }

  return {
    tutorial: data,
    loading,
    error,
    fetchTutorial,
    updateTutorialStep,
    completeTutorial,
    resetTutorial,
    refetch: fetchTutorial
  }
}

export function useClientNotifications() {
  const { data, loading, error, execute } = useApi<{
    notifications: any[]
    unreadCount: number
  }>()

  const fetchNotifications = async (params?: {
    page?: number
    limit?: number
    unread?: boolean
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/client/notifications?${searchParams.toString()}`)
  }

  const markAsRead = async (notificationId: string) => {
    await execute(`/api/client/notifications/${notificationId}/read`, {
      method: 'PUT'
    })
  }

  const markAllAsRead = async () => {
    await execute('/api/client/notifications/read-all', {
      method: 'PUT'
    })
  }

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  }
} 