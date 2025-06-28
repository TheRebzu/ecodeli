import { useState, useEffect } from 'react'

export interface ClientProfile {
  id: string
  userId: string
  user: {
    name: string
    email: string
    phone?: string
    image?: string
    address?: string
    city?: string
    postalCode?: string
    country?: string
    dateOfBirth?: string
  }
  subscriptionPlan: 'FREE' | 'STARTER' | 'PREMIUM'
  preferences: {
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
      marketing: boolean
    }
    language: string
    timezone: string
    defaultPaymentMethod?: string
  }
  documents: Array<{
    id: string
    type: string
    name: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    uploadedAt: string
    url?: string
  }>
  stats: {
    totalOrders: number
    totalSpent: number
    averageRating: number
    completedDeliveries: number
    cancelledOrders: number
  }
  paymentMethods: Array<{
    id: string
    type: 'CARD' | 'PAYPAL' | 'BANK_TRANSFER'
    isDefault: boolean
    lastFour?: string
    expiryDate?: string
    brand?: string
  }>
  addresses: Array<{
    id: string
    label: string
    street: string
    city: string
    postalCode: string
    country: string
    isDefault: boolean
  }>
}

export interface ProfileUpdateData {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  dateOfBirth?: string
  preferences?: any
}

export function useClientProfile() {
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/client/profile')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du profil')
      }

      const data = await response.json()
      setProfile(data.profile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: ProfileUpdateData) => {
    try {
      const response = await fetch('/api/client/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour')
      }

      const result = await response.json()
      setProfile(result.profile)
      return result
    } catch (error) {
      throw error
    }
  }

  const uploadDocument = async (file: File, type: string) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/client/documents', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'upload')
      }

      await fetchProfile() // Recharger le profil
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/client/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      await fetchProfile() // Recharger le profil
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const addPaymentMethod = async (paymentMethodData: any) => {
    try {
      const response = await fetch('/api/client/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentMethodData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'ajout')
      }

      await fetchProfile() // Recharger le profil
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const removePaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`/api/client/payment-methods/${paymentMethodId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      await fetchProfile() // Recharger le profil
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const addAddress = async (addressData: any) => {
    try {
      const response = await fetch('/api/client/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'ajout')
      }

      await fetchProfile() // Recharger le profil
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const updateAddress = async (addressId: string, addressData: any) => {
    try {
      const response = await fetch(`/api/client/addresses/${addressId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour')
      }

      await fetchProfile() // Recharger le profil
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  const deleteAddress = async (addressId: string) => {
    try {
      const response = await fetch(`/api/client/addresses/${addressId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      await fetchProfile() // Recharger le profil
      return await response.json()
    } catch (error) {
      throw error
    }
  }

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
    uploadDocument,
    deleteDocument,
    addPaymentMethod,
    removePaymentMethod,
    addAddress,
    updateAddress,
    deleteAddress
  }
}