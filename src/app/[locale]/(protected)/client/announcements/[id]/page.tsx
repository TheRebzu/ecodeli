"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface Announcement {
  id: string
  title: string
  description: string
  type: string
  pickupAddress: string
  deliveryAddress: string
  weight?: number
  basePrice: number
  finalPrice: number
  status: string
  createdAt: string
  pickupDate?: string
  deliveryDate?: string
  packageDetails?: {
    fragile?: boolean
    weight?: number
    dimensions?: string
  }
  isUrgent: boolean
  specialInstructions?: string
  requiresInsurance: boolean
  _count: {
    reviews: number
    matches: number
    attachments: number
    tracking: number
  }
  matches?: {
    id: string
    delivererId: string
    proposedPrice: number
    message: string
    status: string
    createdAt: string
    deliverer: {
      id: string
      user: {
        id: string
        name: string
        profile?: {
          firstName: string
          lastName: string
          avatar?: string
          phone?: string
        }
      }
      profile?: {
        rating: number
        completedDeliveries: number
      }
    }
  }[]
  reviews?: any[]
  delivery?: any
  attachments?: any[]
}

export default function AnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchAnnouncement(params.id as string)
    }
  }, [params.id])

  const fetchAnnouncement = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/announcements/${id}`)
      
      if (!response.ok) {
        throw new Error('Annonce non trouvée')
      }

      const data = await response.json()
      setAnnouncement(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptMatch = async (matchId: string) => {
    try {
      const response = await fetch(`/api/client/announcements/${params.id}/matches/${matchId}/accept`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchAnnouncement(params.id as string)
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'MATCHED': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'ACTIVE': 'Active',
      'MATCHED': 'Matchée',
      'COMPLETED': 'Terminée',
      'CANCELLED': 'Annulée'
    }
    return labels[status as keyof typeof labels] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-red-600 text-lg mb-2">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              href="/client/announcements"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Retour aux annonces
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/client/announcements"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Retour aux annonces
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{announcement.title}</h1>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(announcement.status)}`}>
                  {getStatusLabel(announcement.status)}
                </span>
                {announcement.isUrgent && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    ⚡ Urgent
                  </span>
                )}
                {announcement.packageDetails?.fragile && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    📦 Fragile
                  </span>
                )}
                {announcement.requiresInsurance && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    🛡️ Assuré
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              {announcement.status === 'ACTIVE' && (
                <>
                  <Link
                    href={`/client/announcements/${announcement.id}/edit`}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Modifier
                  </Link>
                  <Link
                    href={`/client/announcements/${announcement.id}/payment`}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Payer
                  </Link>
                </>
              )}
              {announcement.status === 'MATCHED' && (
                <Link
                  href={`/client/announcements/${announcement.id}/tracking`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Suivre
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Détails de l'annonce */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Détails de la livraison</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{announcement.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Adresse de collecte</h3>
                    <p className="text-gray-600">{announcement.pickupAddress}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Adresse de livraison</h3>
                    <p className="text-gray-600">{announcement.deliveryAddress}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(announcement.weight || announcement.packageDetails?.weight) && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Poids</h3>
                      <p className="text-gray-600">{announcement.weight || announcement.packageDetails?.weight} kg</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Prix de base</h3>
                    <p className="text-gray-600">{announcement.basePrice}€</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Prix final</h3>
                    <p className="text-gray-600 font-semibold">{announcement.finalPrice}€</p>
                  </div>
                  {announcement.pickupDate && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Collecte</h3>
                      <p className="text-gray-600">{new Date(announcement.pickupDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {announcement.deliveryDate && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Échéance</h3>
                      <p className="text-gray-600">{new Date(announcement.deliveryDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {announcement.packageDetails?.dimensions && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Dimensions</h3>
                    <p className="text-gray-600">{announcement.packageDetails.dimensions}</p>
                  </div>
                )}

                {announcement.specialInstructions && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Instructions spéciales</h3>
                    <p className="text-gray-600">{announcement.specialInstructions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Correspondances/Matches */}
            {announcement.matches && announcement.matches.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4">
                  Livreurs intéressés ({announcement.matches.length})
                </h2>
                
                <div className="space-y-4">
                  {announcement.matches.map((match) => (
                    <div key={match.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {match.deliverer.user.profile?.firstName} {match.deliverer.user.profile?.lastName} 
                              ({match.deliverer.user.name})
                            </h3>
                            {match.deliverer.profile?.rating && (
                              <span className="text-yellow-500">⭐ {match.deliverer.profile.rating.toFixed(1)}</span>
                            )}
                            {match.deliverer.profile?.completedDeliveries && (
                              <span className="text-sm text-gray-500">
                                {match.deliverer.profile.completedDeliveries} livraisons
                              </span>
                            )}
                          </div>
                          {match.message && (
                            <p className="text-gray-600 mb-2">{match.message}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {match.proposedPrice && (
                              <span>Prix proposé: {match.proposedPrice}€</span>
                            )}
                            <span>Matchée le {new Date(match.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {announcement.status === 'ACTIVE' && match.status === 'PENDING' && (
                          <button
                            onClick={() => handleAcceptMatch(match.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 ml-4"
                          >
                            Accepter
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-semibold mb-4">Informations</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Créé le:</span>
                  <span className="text-gray-900">{new Date(announcement.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type de service:</span>
                  <span className="text-gray-900">{announcement.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Correspondances:</span>
                  <span className="text-gray-900">{announcement._count.matches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avis:</span>
                  <span className="text-gray-900">{announcement._count.reviews}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}