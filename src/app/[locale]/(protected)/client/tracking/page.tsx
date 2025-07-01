"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useClientDeliveries } from "@/features/deliveries/hooks/useClientDeliveries"
import Link from "next/link"

export default function ClientTrackingPage() {
  const { deliveries, isLoading, error } = useClientDeliveries()
  const [realTimeUpdates, setRealTimeUpdates] = useState<{[key: string]: any}>({})
  const t = useTranslations()

  // Simuler les mises à jour temps réel (à remplacer par WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      const activeDeliveries = deliveries.filter(d => 
        ['ACCEPTED', 'IN_PROGRESS'].includes(d.status)
      )
      
      activeDeliveries.forEach(delivery => {
        // Simuler une position GPS (à remplacer par vraies données)
        const mockPosition = {
          lat: 48.8566 + (Math.random() - 0.5) * 0.01,
          lng: 2.3522 + (Math.random() - 0.5) * 0.01,
          timestamp: new Date().toISOString()
        }
        
        setRealTimeUpdates(prev => ({
          ...prev,
          [delivery.id]: mockPosition
        }))
      })
    }, 5000) // Mise à jour toutes les 5 secondes

    return () => clearInterval(interval)
  }, [deliveries])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800'
      case 'DELIVERED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente'
      case 'ACCEPTED': return 'Acceptée'
      case 'IN_PROGRESS': return 'En cours'
      case 'DELIVERED': return 'Livrée'
      case 'CANCELLED': return 'Annulée'
      default: return status
    }
  }

  const activeDeliveries = deliveries.filter(d => 
    ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(d.status)
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <div className="text-red-600 mb-4">⚠️ Erreur de chargement</div>
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📍 Suivi en Temps Réel
          </h1>
          <p className="text-gray-600">
            Suivez la position de vos livreurs en direct
          </p>
        </div>

        {activeDeliveries.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500 text-lg mb-4">
                📱 Aucune livraison active à suivre
              </div>
              <p className="text-gray-400 mb-6">
                Créez une annonce pour commencer le suivi
              </p>
              <Link href="/client/announcements">
                <Button className="bg-green-600 hover:bg-green-700">
                  📦 Créer une annonce
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Carte interactive (placeholder) */}
            <Card>
              <CardHeader>
                <CardTitle>🗺️ Carte Interactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-4xl mb-4">🗺️</div>
                    <p>Carte GPS interactive</p>
                    <p className="text-sm mt-2">Intégration Google Maps/OpenStreetMap en cours</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des livraisons actives */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeDeliveries.map((delivery) => {
                const position = realTimeUpdates[delivery.id]
                
                return (
                  <Card key={delivery.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            📦 {delivery.announcementTitle}
                            <Badge className={getStatusColor(delivery.status)}>
                              {getStatusLabel(delivery.status)}
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            👤 {delivery.delivererName || 'En attente d\'assignation'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {delivery.price}€
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Adresses */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">📍 Trajet</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                            <span className="text-gray-600">Collecte:</span>
                            <span>{delivery.pickupAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span className="text-gray-600">Livraison:</span>
                            <span>{delivery.deliveryAddress}</span>
                          </div>
                        </div>
                      </div>

                      {/* Position temps réel */}
                      {position && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">📡 Position actuelle</h5>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-sm space-y-1">
                              <p>🧭 Lat: {position.lat.toFixed(6)}</p>
                              <p>🧭 Lng: {position.lng.toFixed(6)}</p>
                              <p>🕐 MAJ: {formatDate(position.timestamp)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Horaires */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">⏰ Horaires</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          {delivery.scheduledDate && (
                            <p>📅 Programmée: {formatDate(delivery.scheduledDate)}</p>
                          )}
                          {delivery.estimatedDelivery && (
                            <p>🎯 Estimation: {formatDate(delivery.estimatedDelivery)}</p>
                          )}
                        </div>
                      </div>

                      {/* Code de validation */}
                      {delivery.validationCode && delivery.status === 'IN_TRANSIT' && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">🔑 Code de validation</h5>
                          <div className="p-3 bg-green-50 rounded-lg text-center">
                            <div className="font-mono text-2xl font-bold text-green-800">
                              {delivery.validationCode}
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                              Communiquez ce code au livreur
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t">
                        <Link href={`/client/deliveries/${delivery.id}`}>
                          <Button variant="outline" size="sm">
                            👁️ Détails
                          </Button>
                        </Link>
                        
                        {delivery.delivererPhone && (
                          <a href={`tel:${delivery.delivererPhone}`}>
                            <Button variant="outline" size="sm">
                              📞 Appeler
                            </Button>
                          </a>
                        )}
                        
                        <Button variant="outline" size="sm">
                          💬 Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Notifications temps réel */}
            <Card>
              <CardHeader>
                <CardTitle>🔔 Notifications en Direct</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="animate-pulse">🚚</span>
                    <div>
                      <p className="text-sm font-medium">Livreur en route</p>
                      <p className="text-xs text-gray-600">Il y a 2 minutes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <span>📍</span>
                    <div>
                      <p className="text-sm font-medium">Position mise à jour</p>
                      <p className="text-xs text-gray-600">Il y a 5 minutes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <span>⏱️</span>
                    <div>
                      <p className="text-sm font-medium">Retard estimé: +10 min</p>
                      <p className="text-xs text-gray-600">Il y a 8 minutes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}