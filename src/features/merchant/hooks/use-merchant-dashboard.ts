import { useState, useEffect } from 'react'
import { MerchantService, type MerchantDashboardData } from '../services/merchant.service'
import { useAuth } from '@/hooks/use-auth'

export function useMerchantDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<MerchantDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/merchant/dashboard`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error('Erreur lors du chargement des données')
        }

        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        console.error('Erreur dashboard merchant:', err)
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.id])

  const refreshData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/merchant/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erreur lors du rechargement des données')
      }

      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err) {
      console.error('Erreur refresh dashboard:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    refreshData
  }
} 