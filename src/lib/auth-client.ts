'use client'

import { createAuth } from '@auth/core'
import { getSession } from '@auth/core'
import { useEffect, useState } from 'react'

// Types pour EcoDeli
export type UserRole = "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN"
export type ValidationStatus = "PENDING" | "PENDING_DOCUMENTS" | "PENDING_VALIDATION" | "VALIDATED" | "REJECTED"

// Types pour la session Better Auth
export interface Session {
  user: {
    id: string
    email: string
    role: UserRole
    status: ValidationStatus
    firstName?: string
    lastName?: string
    phone?: string
    language?: string
    emailVerified?: boolean
    profile?: any
  }
}

export interface User {
  id: string
  email: string
  role: UserRole
  status: ValidationStatus
  firstName?: string
  lastName?: string
  phone?: string
  language?: string
  emailVerified?: boolean
  profile?: any
}

// Hook pour utiliser Better Auth côté client
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const session = await response.json()
          setUser(session?.user || null)
        }
      } catch (error) {
        console.error('Error fetching session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user
  }
} 