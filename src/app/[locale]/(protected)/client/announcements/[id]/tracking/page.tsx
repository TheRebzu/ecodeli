"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Import dynamique pour éviter les erreurs SSR avec les cartes
const MapComponent = dynamic(() => import('@/components/tracking/map-component'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">Chargement de la carte...</div>
})

interface TrackingEvent {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  location?: {
    lat: number
    lng: number
    address: string
  }
}

interface Delivery {
  id: string
  status: string
  pickupDate: string
  deliveryDate?: string
  deliverer: {
    id: string
    name: string
    phone: string
    avatar?: string
    rating: number
  }
  tracking: TrackingEvent[]
  validationCode?: string
  estimatedArrival?: string
  currentLocation?: {
    lat: number
    lng: number
  }
}

interface Announcement {
  id: string
  title: string
  description: string
  pickupAddress: string
  deliveryAddress: string
  status: string
  delivery?: Delivery
}

export default function AnnouncementTrackingPage() {
  const params = useParams()
  const t = useTranslations()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchTrackingData(params.id as string)
    }
  }, [params.id])

  // Mise à jour en temps réel toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      if (params.id && !loading) {
        refreshTrackingData(params.id as string)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [params.id, loading])

  const fetchTrackingData = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/announcements/${id}/tracking`)
      
      if (!response.ok) {
        throw new Error('Données de suivi non trouvées')
      }

      const data = await response.json()
      setAnnouncement(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const refreshTrackingData = async (id: string) => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/client/announcements/${id}/tracking`)
      
      if (response.ok) {
        const data = await response.json()
        setAnnouncement(data)
      }
    } catch (err) {
      // Ignorer les erreurs de rafraîchissement
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'ACCEPTED': 'bg-blue-100 text-blue-800',
      'PICKED_UP': 'bg-purple-100 text-purple-800',
      'IN_TRANSIT': 'bg-indigo-100 text-indigo-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'COMPLETED': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'PENDING': 'En attente',
      'ACCEPTED': 'Acceptée',
      'PICKED_UP': 'Collectée',
      'IN_TRANSIT': 'En transit',
      'DELIVERED': 'Livrée',
      'COMPLETED': 'Terminée'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getTrackingIcon = (type: string) => {
    const icons = {
      'pickup': '📦',
      'in_transit': '🚚',
      'delivered': '✅',
      'delay': '⏰',
      'issue': '⚠️',
      'update': '📍'
    }
    return icons[type as keyof typeof icons] || '📍'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="bg-white rounded-lg p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
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

  if (!announcement.delivery) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-yellow-600 text-lg mb-2">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Pas encore de livraison</h3>
            <p className="text-gray-600 mb-4">
              Cette annonce n'a pas encore été acceptée par un livreur.
            </p>
            <Link
              href={`/client/announcements/${announcement.id}`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Voir l'annonce
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const delivery = announcement.delivery

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/client/announcements/${announcement.id}`}
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Retour à l'annonce
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Suivi de livraison</h1>
              <p className="text-gray-600">{announcement.title}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(delivery.status)}`}>
                {getStatusLabel(delivery.status)}
              </span>
              {refreshing && (
                <div className="text-sm text-gray-500">🔄 Mise à jour...</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline et informations */}
          <div className="space-y-6">
            {/* Informations du livreur */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Votre livreur</h2>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  {delivery.deliverer.avatar ? (
                    <img 
                      src={delivery.deliverer.avatar} 
                      alt={delivery.deliverer.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-green-600 font-medium">
                      {delivery.deliverer.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{delivery.deliverer.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>⭐ {delivery.deliverer.rating.toFixed(1)}</span>
                    <span>•</span>
                    <span>📞 {delivery.deliverer.phone}</span>
                  </div>
                </div>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
                  Contacter
                </button>
              </div>
            </div>

            {/* Code de validation */}
            {delivery.validationCode && delivery.status === 'DELIVERED' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-medium text-blue-900 mb-2">Code de validation</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">{delivery.validationCode}</div>
                <p className="text-sm text-blue-800">
                  Communiquez ce code au livreur pour confirmer la réception.
                </p>
              </div>
            )}

            {/* Estimation d'arrivée */}
            {delivery.estimatedArrival && delivery.status === 'IN_TRANSIT' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">🕐</span>
                  <span className="font-medium text-green-900">
                    Arrivée estimée: {new Date(delivery.estimatedArrival).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Historique de livraison</h2>
              
              <div className="space-y-4">
                {delivery.tracking.map((event, index) => (
                  <div key={event.id} className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        index === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {getTrackingIcon(event.type)}
                      </div>
                      {index < delivery.tracking.length - 1 && (
                        <div className="w-px h-6 bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{event.title}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                      {event.location && (
                        <p className="text-gray-500 text-xs mt-1">📍 {event.location.address}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carte */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Localisation en temps réel</h2>
              
              <MapComponent
                pickup={announcement.pickupAddress}
                delivery={announcement.deliveryAddress}
                currentLocation={delivery.currentLocation}
                delivererName={delivery.deliverer.name}
              />
            </div>

            {/* Informations de livraison */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-semibold mb-4">Informations de livraison</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Collecte:</span>
                  <p className="text-gray-900">{announcement.pickupAddress}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(delivery.pickupDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Livraison:</span>
                  <p className="text-gray-900">{announcement.deliveryAddress}</p>
                  {delivery.deliveryDate && (
                    <p className="text-gray-500 text-xs">
                      {new Date(delivery.deliveryDate).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                  📞 Appeler le livreur
                </button>
                <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                  💬 Envoyer un message
                </button>
                {delivery.status === 'DELIVERED' && (
                  <Link
                    href={`/client/announcements/${announcement.id}/confirm`}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm text-center block"
                  >
                    ✅ Confirmer la réception
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}