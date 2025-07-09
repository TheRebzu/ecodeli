'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  deliveryFee: number
  notes?: string
  deliveryAddress: string
  scheduledDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    profile?: {
      firstName?: string
      lastName?: string
    }
  }
  items?: OrderItem[]
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface OrderStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
}

interface UseOrdersReturn {
  orders: Order[]
  stats: OrderStats | null
  isLoading: boolean
  error: string | null
  updateOrderStatus: (id: string, status: string) => Promise<void>
}

export function useOrders(): UseOrdersReturn {
  const t = useTranslations('merchant.orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/merchant/orders')
      if (!response.ok) {
        throw new Error(t('error.fetchFailed'))
      }
      
      const data = await response.json()
      setOrders(data.orders || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setIsLoading(false)
    }
  }

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/merchant/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      
      if (!response.ok) {
        throw new Error(t('error.updateFailed'))
      }
      
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'))
      throw err
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return {
    orders,
    stats,
    isLoading,
    error,
    updateOrderStatus,
  }
} 