"use client"

import { useState, useEffect, useCallback } from "react"
import type { RouteMatch } from "@/features/announcements/types/announcement.types"

interface UseOpportunitiesOptions {
  filters?: {
    minDistance?: number
    maxDistance?: number
    serviceType?: string
    urgency?: string
  }
  pagination?: {
    page?: number
    limit?: number
  }
  autoFetch?: boolean
}

interface UseOpportunitiesReturn {
  opportunities: RouteMatch[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  refresh: () => void
  acceptOpportunity: (opportunityId: string) => Promise<void>
  declining: string | null
  accepting: string | null
}

export function useOpportunities({
  filters = {},
  pagination = { page: 1, limit: 20 },
  autoFetch = true
}: UseOpportunitiesOptions = {}): UseOpportunitiesReturn {
  const [opportunities, setOpportunities] = useState<RouteMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [declining, setDeclining] = useState<string | null>(null)
  const [paginationState, setPaginationState] = useState({
    page: pagination.page || 1,
    limit: pagination.limit || 20,
    total: 0,
    totalPages: 0
  })

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: paginationState.page.toString(),
        limit: paginationState.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      })

      const response = await fetch(`/api/deliverer/opportunities?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement des opportunités')
      }

      setOpportunities(data.data || [])
      setPaginationState({
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 20,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [filters, paginationState.page, paginationState.limit])

  const acceptOpportunity = useCallback(async (opportunityId: string) => {
    setAccepting(opportunityId)
    setError(null)

    try {
      const response = await fetch(`/api/deliverer/opportunities/${opportunityId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'acceptation')
      }

      // Remove the accepted opportunity from the list
      setOpportunities(prev => 
        prev.filter(opp => opp.id !== opportunityId)
      )

      // Show success message or handle success
      // This could be done via a toast notification system
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'acceptation')
    } finally {
      setAccepting(null)
    }
  }, [])

  const refresh = useCallback(() => {
    setPaginationState(prev => ({ ...prev, page: 1 }))
    fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    if (autoFetch) {
      fetchOpportunities()
    }
  }, [autoFetch, fetchOpportunities])

  // Reset page when filters change
  useEffect(() => {
    setPaginationState(prev => ({ ...prev, page: 1 }))
  }, [filters])

  return {
    opportunities,
    loading,
    error,
    pagination: paginationState,
    refresh,
    acceptOpportunity,
    declining,
    accepting
  }
}