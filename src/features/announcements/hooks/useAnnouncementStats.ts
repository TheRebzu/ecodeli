"use client"

import { useState, useEffect } from 'react'

interface AnnouncementStats {
  active: number
  matched: number
  completed: number
  totalSaved: number
  isLoading: boolean
  error: string | null
}

export function useAnnouncementStats(): AnnouncementStats {
  const [stats, setStats] = useState<AnnouncementStats>({
    active: 0,
    matched: 0,
    completed: 0,
    totalSaved: 0,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/client/announcements/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      const data = await response.json()
      setStats({
        active: data.active || 0,
        matched: data.matched || 0,
        completed: data.completed || 0,
        totalSaved: data.totalSaved || 0,
        isLoading: false,
        error: null
      })
    } catch (error) {
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }

  return stats
}