'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name?: string
  role: string
  emailVerified: boolean
  isActive: boolean
  validationStatus: string
}

interface AuthSession {
  user: User
  session: {
    id: string
    userId: string
    expiresAt: string
  }
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      setLoading(true)
      
      // Utiliser Better-Auth endpoint
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        try {
          const data = await response.json()
          
          // Better-Auth peut retourner directement user et session ou null
          if (data && data.user) {
            setSession({
              user: data.user,
              session: data.session || { id: 'temp', userId: data.user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
            })
            setError(null)
          } else {
            setSession(null)
          }
        } catch (jsonError) {
          // Si la réponse n'est pas du JSON valide ou est null
          setSession(null)
        }
      } else {
        setSession(null)
        if (response.status !== 401 && response.status !== 404) {
          setError(`Erreur ${response.status}`)
        }
      }
    } catch (err) {
      console.error('Erreur vérification session:', err)
      setSession(null)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        await checkSession()
        return { success: true, data }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur de connexion')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (userData: {
    email: string
    password: string
    name: string
    role: string
  }) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...userData,
          emailVerified: false
        }),
      })

      if (response.ok) {
        const data = await response.json()
        await checkSession()
        return { success: true, data }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur d\'inscription')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'inscription')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        setSession(null)
        setError(null)
        return { success: true }
      } else {
        throw new Error('Erreur de déconnexion')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de déconnexion')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    session,
    user: session?.user,
    isAuthenticated: !!session,
    loading,
    isLoading: loading,
    error,
    signIn,
    signUp,
    signOut,
    refetch: checkSession,
    role: session?.user?.role,
    isActive: session?.user?.isActive ?? false,
    validationStatus: session?.user?.validationStatus,
    emailVerified: session?.user?.emailVerified ?? false
  }
} 