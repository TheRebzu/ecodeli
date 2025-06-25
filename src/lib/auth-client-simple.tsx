"use client"

import React, { useState, useEffect, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { AuthUser } from "./auth-simple"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Récupérer l'utilisateur au chargement
  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Erreur récupération utilisateur:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Connexion
  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error("Erreur connexion:", error)
      return { success: false, error: "Erreur de connexion" }
    }
  }

  // Déconnexion
  const signOut = async () => {
    try {
      await fetch("/api/auth/simple-logout", {
        method: "POST"
      })
      setUser(null)
      router.push("/fr/login")
    } catch (error) {
      console.error("Erreur déconnexion:", error)
      // Forcer la déconnexion même en cas d'erreur
      setUser(null)
      router.push("/fr/login")
    }
  }

  // Actualiser l'utilisateur
  const refreshUser = async () => {
    await fetchUser()
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
} 