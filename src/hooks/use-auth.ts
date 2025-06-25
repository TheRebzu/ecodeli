'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'

export interface User {
  id: string
  email: string
  role: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN'
  profile?: {
    firstName?: string
    lastName?: string
    avatar?: string
  }
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        const session = await authClient.getSession()
        
        if (mounted) {
          if (session?.user) {
            setState({
              user: session.user as User,
              loading: false,
              error: null
            })
          } else {
            setState({
              user: null,
              loading: false,
              error: null
            })
          }
        }
      } catch (error) {
        if (mounted) {
          setState({
            user: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Authentication error'
          })
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await authClient.signIn.email({
        email,
        password
      })

      if (result.data?.user) {
        setState({
          user: result.data.user as User,
          loading: false,
          error: null
        })
        return { success: true, user: result.data.user }
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Invalid credentials' 
        }))
        return { success: false, error: 'Invalid credentials' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }))
      return { success: false, error: errorMessage }
    }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }))
    
    try {
      await authClient.signOut()
      setState({
        user: null,
        loading: false,
        error: null
      })
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      }))
    }
  }

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
    isLoading: state.loading
  }
} 