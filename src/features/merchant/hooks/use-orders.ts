'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'

interface OrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Order {
  id: string
  orderNumber: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  totalAmount: number
  deliveryFee: number
  notes?: string
  deliveryAddress: string
  scheduledDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  client: {
    id: string
    profile?: {
      firstName?: string
      lastName?: string
    }
  }
  items: OrderItem[]
}

interface OrderStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
}

export function useOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/merchant/orders')
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders')
        }

        const data = await response.json()
        setOrders(data.orders || [])
        setStats(data.stats || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [user])

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const response = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Failed to update order status')
      }

      const updatedOrder = await response.json()
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o))
      return updatedOrder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }

  return {
    orders,
    stats,
    isLoading,
    error,
    updateOrderStatus,
  }
} 