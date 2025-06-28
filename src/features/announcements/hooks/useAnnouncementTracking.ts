"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface TrackingUpdate {
  id: string
  announcementId: string
  status: string
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
  timestamp: string
  message?: string
  estimatedArrival?: string
}

interface UseAnnouncementTrackingOptions {
  announcementId: string
  enableRealTime?: boolean
  pollingInterval?: number
}

interface UseAnnouncementTrackingReturn {
  tracking: TrackingUpdate[]
  currentStatus: string | null
  currentLocation: TrackingUpdate['location'] | null
  estimatedArrival: string | null
  loading: boolean
  error: string | null
  refresh: () => void
  isRealTimeActive: boolean
  toggleRealTime: () => void
}

export function useAnnouncementTracking({
  announcementId,
  enableRealTime = true,
  pollingInterval = 30000 // 30 seconds
}: UseAnnouncementTrackingOptions): UseAnnouncementTrackingReturn {
  const [tracking, setTracking] = useState<TrackingUpdate[]>([])
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<TrackingUpdate['location'] | null>(null)
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRealTimeActive, setIsRealTimeActive] = useState(enableRealTime)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<string | null>(null)

  const fetchTracking = useCallback(async () => {
    if (!announcementId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/shared/deliveries/${announcementId}/tracking`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement du tracking')
      }

      const updates = data.tracking || []
      setTracking(updates)

      // Update current status and location from the latest update
      if (updates.length > 0) {
        const latest = updates[updates.length - 1]
        setCurrentStatus(latest.status)
        setCurrentLocation(latest.location || null)
        setEstimatedArrival(latest.estimatedArrival || null)
        lastUpdateRef.current = latest.timestamp
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [announcementId])

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      fetchTracking()
    }, pollingInterval)
  }, [fetchTracking, pollingInterval])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const toggleRealTime = useCallback(() => {
    setIsRealTimeActive(prev => {
      const newState = !prev
      if (newState) {
        startPolling()
      } else {
        stopPolling()
      }
      return newState
    })
  }, [startPolling, stopPolling])

  const refresh = useCallback(() => {
    fetchTracking()
  }, [fetchTracking])

  // Initial fetch and setup polling
  useEffect(() => {
    fetchTracking()
    
    if (isRealTimeActive) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [announcementId, isRealTimeActive, fetchTracking, startPolling, stopPolling])

  // Handle page visibility changes to optimize polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else if (isRealTimeActive) {
        startPolling()
        // Refresh immediately when page becomes visible
        refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isRealTimeActive, startPolling, stopPolling, refresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    tracking,
    currentStatus,
    currentLocation,
    estimatedArrival,
    loading,
    error,
    refresh,
    isRealTimeActive,
    toggleRealTime
  }
}