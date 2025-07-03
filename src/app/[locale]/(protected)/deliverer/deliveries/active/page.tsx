'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, Package, Phone, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useActiveDeliveries, type ActiveDelivery } from '@/features/deliverer/hooks/useActiveDeliveries'

// Fonction helper pour formater les dates
function formatDate(date: string | Date | null | undefined): { date: string; time: string } {
  if (!date) {
    return {
      date: '--',
      time: '--'
    }
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Vérifier si la date est valide
  if (isNaN(dateObj.getTime())) {
    return {
      date: '--',
      time: '--'
    }
  }
  
  return {
    date: dateObj.toLocaleDateString('fr-FR'),
    time: dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
}

// Component pour charger les livraisons actives
function ActiveDeliveriesContent() {
  const t = useTranslations('deliverer.deliveries')
  const { deliveries, loading, error, refetch } = useActiveDeliveries()
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleUpdateStatus = async (deliveryId: string, currentStatus: string) => {
    try {
      setUpdatingStatus(deliveryId)
      setStatusMessage(null)
      
      // Déterminer le prochain statut logique
      let nextStatus: string
      let statusLabel: string
      switch (currentStatus) {
        case 'ACCEPTED':
          nextStatus = 'PICKED_UP'
          statusLabel = 'Récupération du colis'
          break
        case 'IN_TRANSIT':
          nextStatus = 'DELIVERED'
          statusLabel = 'Livraison terminée'
          break
        default:
          console.error('Statut non géré:', currentStatus)
          setStatusMessage({ type: 'error', message: 'Statut non géré' })
          return
      }

      console.log(`🔄 Mise à jour statut: ${currentStatus} -> ${nextStatus}`)

      const response = await fetch(`/api/deliverer/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus })
      })

      if (response.ok) {
        setStatusMessage({ type: 'success', message: `Statut mis à jour: ${statusLabel}` })
        // Recharger les livraisons après mise à jour
        await refetch()
        // Effacer le message après 3 secondes
        setTimeout(() => setStatusMessage(null), 3000)
      } else {
        const errorData = await response.json()
        console.error('Erreur mise à jour statut:', errorData)
        setStatusMessage({ 
          type: 'error', 
          message: errorData.error || 'Impossible de mettre à jour le statut' 
        })
      }
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      setStatusMessage({ type: 'error', message: 'Erreur lors de la mise à jour du statut' })
    } finally {
      setUpdatingStatus(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded-lg w-64" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('active.title')}</h1>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {deliveries.length} {t('active.count')}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="text-center py-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {statusMessage && (
        <Card className={statusMessage.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <CardContent className="flex items-center space-x-2 py-4">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={statusMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {statusMessage.message}
            </p>
          </CardContent>
        </Card>
      )}

      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('active.empty.title')}</h3>
            <p className="text-muted-foreground mb-6">{t('active.empty.description')}</p>
            <Button asChild>
              <Link href="/fr/deliverer/opportunities">
                {t('active.empty.action')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {deliveries.map((delivery: ActiveDelivery) => (
            <Card key={delivery.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{delivery.announcement.title}</CardTitle>
                    <p className="text-muted-foreground">{delivery.announcement.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Badge 
                      variant={delivery.status === 'IN_TRANSIT' ? 'default' : 'secondary'}
                      className="text-sm"
                    >
                      {delivery.status === 'ACCEPTED' && t('status.accepted')}
                      {delivery.status === 'IN_TRANSIT' && t('status.inTransit')}
                    </Badge>
                    <span className="text-lg font-bold text-green-600">
                      {delivery.price.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Informations de collecte */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-blue-600">{t('pickup.title')}</p>
                      <p className="text-sm">{delivery.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-8">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formatDate(delivery.scheduledPickupDate).date} à {formatDate(delivery.scheduledPickupDate).time}
                    </span>
                  </div>
                </div>

                {/* Informations de livraison */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-green-600">{t('delivery.title')}</p>
                      <p className="text-sm">{delivery.deliveryAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-8">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formatDate(delivery.scheduledDeliveryDate).date} à {formatDate(delivery.scheduledDeliveryDate).time}
                    </span>
                  </div>
                </div>

                {/* Informations client */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">{t('client.info')}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {delivery.client.firstName} {delivery.client.lastName}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{delivery.client.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Code de validation - MASQUÉ POUR LE LIVREUR */}
                {/* Le code de validation doit être visible uniquement par le client */}
                {/*
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-sm text-amber-800 mb-1">{t('validationCode.title')}</h4>
                  <p className="text-xs text-amber-700 mb-2">{t('validationCode.description')}</p>
                  <span className="text-2xl font-mono font-bold text-amber-800 tracking-wider">
                    {delivery.validationCode}
                  </span>
                </div>
                */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-sm text-blue-800 mb-1">Instructions de validation</h4>
                  <p className="text-xs text-blue-700 mb-2">
                    Lors de la remise, demandez au client le code de validation à 6 chiffres. Saisissez ce code pour valider la livraison et débloquer le paiement.
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-800">Code requis :</span>
                    <span className="text-sm text-blue-600">6 chiffres fournis par le client</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button asChild className="flex-1">
                    <Link href={`/fr/deliverer/deliveries/${delivery.id}`}>
                      {t('actions.viewDetails')}
                    </Link>
                  </Button>
                  
                  {delivery.status === 'ACCEPTED' && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleUpdateStatus(delivery.id, delivery.status)}
                      disabled={updatingStatus === delivery.id}
                    >
                      {updatingStatus === delivery.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Mise à jour...
                        </>
                      ) : (
                        t('actions.startDelivery')
                      )}
                    </Button>
                  )}
                  
                  {delivery.status === 'IN_TRANSIT' && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleUpdateStatus(delivery.id, delivery.status)}
                      disabled={updatingStatus === delivery.id}
                    >
                      {updatingStatus === delivery.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Mise à jour...
                        </>
                      ) : (
                        t('actions.updateStatus')
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Page principale
export default function ActiveDeliveriesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ActiveDeliveriesContent />
    </div>
  )
} 