'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import type {
  DelivererProfile,
  DelivererDocument,
  DelivererDocumentSummary,
  DelivererDelivery,
  DelivererDeliveryStats,
  DeliveryOpportunity,
  DelivererRoute,
  DelivererWallet,
  WithdrawalRequest,
  NFCCard,
  DelivererAvailability,
  DelivererEarnings,
  DelivererDashboardStats
} from '../types'

export function useDelivererProfile() {
  const { data, loading, error, execute } = useApi<DelivererProfile>()

  const fetchProfile = async () => {
    await execute('/api/deliverer/profile')
  }

  const updateProfile = async (profileData: Partial<DelivererProfile>) => {
    await execute('/api/deliverer/profile', {
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

export function useDelivererDocuments() {
  const { data, loading, error, execute } = useApi<{
    documents: DelivererDocument[]
    summary: DelivererDocumentSummary
  }>()

  const fetchDocuments = async () => {
    await execute('/api/deliverer/documents')
  }

  const uploadDocument = async (formData: FormData) => {
    await execute('/api/deliverer/documents', {
      method: 'POST',
      body: formData
    })
  }

  const deleteDocument = async (documentId: string) => {
    await execute(`/api/deliverer/documents`, {
      method: 'DELETE',
      body: JSON.stringify({ documentId })
    })
  }

  return {
    documents: data?.documents || [],
    summary: data?.summary,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments
  }
}

export function useDelivererDeliveries() {
  const { data, loading, error, execute } = useApi<{
    deliveries: DelivererDelivery[]
    stats: DelivererDeliveryStats
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>()

  const fetchDeliveries = async (params?: {
    page?: number
    limit?: number
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
    
    await execute(`/api/deliverer/deliveries?${searchParams.toString()}`)
  }

  const acceptOpportunity = async (opportunityData: {
    announcementId: string
    routeId?: string
    notes?: string
  }) => {
    await execute('/api/deliverer/deliveries', {
      method: 'POST',
      body: JSON.stringify(opportunityData)
    })
  }

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    await execute('/api/deliverer/deliveries', {
      method: 'PUT',
      body: JSON.stringify({ deliveryId, status })
    })
  }

  const validateDelivery = async (deliveryId: string, validationCode: string) => {
    await execute(`/api/deliverer/deliveries/${deliveryId}`, {
      method: 'POST',
      body: JSON.stringify({ validationCode })
    })
  }

  return {
    deliveries: data?.deliveries || [],
    stats: data?.stats,
    pagination: data?.pagination,
    loading,
    error,
    fetchDeliveries,
    acceptOpportunity,
    updateDeliveryStatus,
    validateDelivery,
    refetch: fetchDeliveries
  }
}

export function useDeliveryOpportunities() {
  const { data, loading, error, execute } = useApi<{
    opportunities: DeliveryOpportunity[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }>()

  const fetchOpportunities = async (params?: {
    page?: number
    limit?: number
    type?: string
    maxDistance?: number
    minEarnings?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/deliverer/opportunities?${searchParams.toString()}`)
  }

  const acceptOpportunity = async (opportunityId: string, routeId?: string) => {
    await execute(`/api/deliverer/opportunities/${opportunityId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ routeId })
    })
  }

  return {
    opportunities: data?.opportunities || [],
    pagination: data?.pagination,
    loading,
    error,
    fetchOpportunities,
    acceptOpportunity,
    refetch: fetchOpportunities
  }
}

export function useDelivererRoutes() {
  const { data, loading, error, execute } = useApi<DelivererRoute[]>()

  const fetchRoutes = async () => {
    await execute('/api/deliverer/routes')
  }

  const createRoute = async (routeData: {
    name: string
    startLocation: string
    endLocation: string
    startTime: string
    endTime: string
    isRecurring: boolean
    recurringDays?: string[]
    maxCapacity: number
  }) => {
    await execute('/api/deliverer/routes', {
      method: 'POST',
      body: JSON.stringify(routeData)
    })
  }

  const updateRoute = async (routeId: string, routeData: Partial<DelivererRoute>) => {
    await execute(`/api/deliverer/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify(routeData)
    })
  }

  const deleteRoute = async (routeId: string) => {
    await execute(`/api/deliverer/routes/${routeId}`, {
      method: 'DELETE'
    })
  }

  return {
    routes: data || [],
    loading,
    error,
    fetchRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    refetch: fetchRoutes
  }
}

export function useDelivererWallet() {
  const { data, loading, error, execute } = useApi<DelivererWallet>()

  const fetchWallet = async (params?: {
    page?: number
    limit?: number
    type?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/deliverer/wallet?${searchParams.toString()}`)
  }

  const requestWithdrawal = async (withdrawalData: {
    amount: number
    bankAccount: string
  }) => {
    await execute('/api/deliverer/wallet', {
      method: 'POST',
      body: JSON.stringify(withdrawalData)
    })
  }

  return {
    wallet: data,
    loading,
    error,
    fetchWallet,
    requestWithdrawal,
    refetch: fetchWallet
  }
}

export function useWithdrawals() {
  const { data, loading, error, execute } = useApi<{
    withdrawals: WithdrawalRequest[]
    stats: {
      totalWithdrawn: number
      pendingAmount: number
      avgProcessingTime: number
    }
  }>()

  const fetchWithdrawals = async (params?: {
    page?: number
    limit?: number
    status?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/deliverer/wallet/withdraw?${searchParams.toString()}`)
  }

  const requestWithdrawal = async (withdrawalData: {
    amount: number
    bankAccount: string
  }) => {
    await execute('/api/deliverer/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawalData)
    })
  }

  return {
    withdrawals: data?.withdrawals || [],
    stats: data?.stats,
    loading,
    error,
    fetchWithdrawals,
    requestWithdrawal,
    refetch: fetchWithdrawals
  }
}

export function useNFCCard() {
  const { data, loading, error, execute } = useApi<NFCCard>()

  const fetchNFCCard = async () => {
    await execute('/api/deliverer/nfc-card')
  }

  const generateNFCCard = async () => {
    await execute('/api/deliverer/nfc-card', {
      method: 'POST'
    })
  }

  return {
    nfcCard: data,
    loading,
    error,
    fetchNFCCard,
    generateNFCCard,
    refetch: fetchNFCCard
  }
}

export function useDelivererPlanning() {
  const { data, loading, error, execute } = useApi<{
    availabilities: DelivererAvailability[]
    scheduledDeliveries: DelivererDelivery[]
    plannedRoutes: DelivererRoute[]
  }>()

  const fetchPlanning = async (params?: {
    startDate?: string
    endDate?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/deliverer/planning?${searchParams.toString()}`)
  }

  const setAvailability = async (availabilityData: {
    date?: string
    startTime: string
    endTime: string
    isRecurring?: boolean
    recurringPattern?: string
    maxCapacity?: number
  }) => {
    await execute('/api/deliverer/planning', {
      method: 'POST',
      body: JSON.stringify(availabilityData)
    })
  }

  const removeAvailability = async (availabilityId: string) => {
    await execute('/api/deliverer/planning', {
      method: 'DELETE',
      body: JSON.stringify({ availabilityId })
    })
  }

  return {
    availabilities: data?.availabilities || [],
    scheduledDeliveries: data?.scheduledDeliveries || [],
    plannedRoutes: data?.plannedRoutes || [],
    loading,
    error,
    fetchPlanning,
    setAvailability,
    removeAvailability,
    refetch: fetchPlanning
  }
}

export function useDelivererEarnings() {
  const { data, loading, error, execute } = useApi<DelivererEarnings>()

  const fetchEarnings = async (params?: {
    period?: 'WEEK' | 'MONTH' | 'YEAR'
    startDate?: string
    endDate?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value.toString())
      })
    }
    
    await execute(`/api/deliverer/earnings?${searchParams.toString()}`)
  }

  return {
    earnings: data,
    loading,
    error,
    fetchEarnings,
    refetch: fetchEarnings
  }
}

export function useDelivererDashboard() {
  const { data, loading, error, execute } = useApi<DelivererDashboardStats>()

  const fetchDashboard = async () => {
    await execute('/api/deliverer/dashboard')
  }

  return {
    stats: data,
    loading,
    error,
    fetchDashboard,
    refetch: fetchDashboard
  }
} 