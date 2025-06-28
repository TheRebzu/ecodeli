"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useClientDeliveries } from "@/features/deliveries/hooks/useClientDeliveries"
import Link from "next/link"

const statusLabels = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED: { label: 'Acceptée', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Livrée', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-800' }
}

export default function ClientDeliveriesPage() {
  const [confirmationDialog, setConfirmationDialog] = useState(false)
  const [ratingDialog, setRatingDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null)
  const [validationCode, setValidationCode] = useState("")
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  
  const { 
    deliveries, 
    isLoading, 
    error, 
    confirmDelivery, 
    rateDelivery, 
    cancelDelivery 
  } = useClientDeliveries()

  const t = useTranslations()

  const handleConfirmDelivery = async () => {
    if (!selectedDelivery || !validationCode) return
    
    try {
      await confirmDelivery(selectedDelivery.id, validationCode)
      setConfirmationDialog(false)
      setValidationCode("")
      setSelectedDelivery(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur confirmation')
    }
  }

  const handleRateDelivery = async () => {
    if (!selectedDelivery) return
    
    try {
      await rateDelivery(selectedDelivery.id, rating, review)
      setRatingDialog(false)
      setRating(5)
      setReview("")
      setSelectedDelivery(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur évaluation')
    }
  }

  const handleCancelDelivery = async () => {
    if (!selectedDelivery || !cancelReason) return
    
    try {
      await cancelDelivery(selectedDelivery.id, cancelReason)
      setCancelDialog(false)
      setCancelReason("")
      setSelectedDelivery(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur annulation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const activeDeliveries = deliveries.filter(d => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(d.status))
  const completedDeliveries = deliveries.filter(d => ['DELIVERED', 'CANCELLED'].includes(d.status))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
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
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Réessayer
              </Button>
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
            🚚 Mes Livraisons
          </h1>
          <p className="text-gray-600">
            Suivez l'état de vos livraisons en temps réel
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="active">En cours ({activeDeliveries.length})</TabsTrigger>
            <TabsTrigger value="history">Historique ({completedDeliveries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeDeliveries.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-gray-500 text-lg mb-4">
                    🚚 Aucune livraison active
                  </div>
                  <p className="text-gray-400 mb-6">
                    Vos livraisons en cours apparaîtront ici
                  </p>
                  <Link href="/client/announcements">
                    <Button className="bg-green-600 hover:bg-green-700">
                      📦 Créer une annonce
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              activeDeliveries.map((delivery) => (
                <Card key={delivery.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          📦 {delivery.announcementTitle}
                          <Badge className={statusLabels[delivery.status].color}>
                            {statusLabels[delivery.status].label}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          📅 {delivery.scheduledDate && formatDate(delivery.scheduledDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {delivery.price}€
                        </div>
                        {delivery.delivererName && (
                          <div className="text-sm text-gray-500">
                            👤 {delivery.delivererName}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">📍 Adresses</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>🔄 Collecte: {delivery.pickupAddress}</p>
                          <p>📍 Livraison: {delivery.deliveryAddress}</p>
                        </div>
                      </div>

                      {delivery.validationCode && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">🔑 Code de validation</h5>
                          <div className="p-2 bg-gray-100 rounded font-mono text-lg text-center">
                            {delivery.validationCode}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Link href={`/client/deliveries/${delivery.id}/tracking`}>
                        <Button variant="outline" size="sm">
                          📍 Suivre
                        </Button>
                      </Link>
                      
                      {delivery.delivererPhone && (
                        <a href={`tel:${delivery.delivererPhone}`}>
                          <Button variant="outline" size="sm">
                            📞 Appeler
                          </Button>
                        </a>
                      )}
                      
                      {delivery.status === 'IN_PROGRESS' && (
                        <Dialog open={confirmationDialog} onOpenChange={setConfirmationDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setSelectedDelivery(delivery)}
                            >
                              ✅ Confirmer réception
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirmer la réception</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="validationCode">Code de validation (6 chiffres)</Label>
                                <Input
                                  id="validationCode"
                                  type="text"
                                  maxLength={6}
                                  placeholder="123456"
                                  value={validationCode}
                                  onChange={(e) => setValidationCode(e.target.value)}
                                />
                              </div>
                              <Button 
                                onClick={handleConfirmDelivery}
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={validationCode.length !== 6}
                              >
                                ✅ Confirmer la livraison
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {delivery.status === 'PENDING' && (
                        <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setSelectedDelivery(delivery)}
                            >
                              ❌ Annuler
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Annuler la livraison</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="cancelReason">Raison de l'annulation</Label>
                                <Textarea
                                  id="cancelReason"
                                  placeholder="Expliquez pourquoi vous annulez cette livraison..."
                                  value={cancelReason}
                                  onChange={(e) => setCancelReason(e.target.value)}
                                />
                              </div>
                              <Button 
                                onClick={handleCancelDelivery}
                                className="w-full bg-red-600 hover:bg-red-700"
                                disabled={!cancelReason.trim()}
                              >
                                ❌ Confirmer l'annulation
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {completedDeliveries.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="text-gray-500 text-lg mb-4">
                    📂 Aucun historique
                  </div>
                  <p className="text-gray-400">
                    Vos livraisons terminées apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedDeliveries.map((delivery) => (
                <Card key={delivery.id} className={`border-l-4 ${delivery.status === 'DELIVERED' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          📦 {delivery.announcementTitle}
                          <Badge className={statusLabels[delivery.status].color}>
                            {statusLabels[delivery.status].label}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          📅 {delivery.actualDelivery ? formatDate(delivery.actualDelivery) : formatDate(delivery.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {delivery.price}€
                        </div>
                        {delivery.delivererName && (
                          <div className="text-sm text-gray-500">
                            👤 {delivery.delivererName}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">📍 Adresses</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>🔄 Collecte: {delivery.pickupAddress}</p>
                          <p>📍 Livraison: {delivery.deliveryAddress}</p>
                        </div>
                      </div>

                      {delivery.rating && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">⭐ Votre évaluation</h5>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < delivery.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                                ⭐
                              </span>
                            ))}
                          </div>
                          {delivery.review && (
                            <p className="text-sm text-gray-600 mt-1">"{delivery.review}"</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Link href={`/client/deliveries/${delivery.id}`}>
                        <Button variant="outline" size="sm">
                          👁️ Voir détails
                        </Button>
                      </Link>
                      
                      {delivery.status === 'DELIVERED' && !delivery.rating && (
                        <Dialog open={ratingDialog} onOpenChange={setRatingDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedDelivery(delivery)}
                            >
                              ⭐ Évaluer
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Évaluer la livraison</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Note sur 5</Label>
                                <div className="flex items-center gap-1 mt-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setRating(star)}
                                      className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                    >
                                      ⭐
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="review">Commentaire (optionnel)</Label>
                                <Textarea
                                  id="review"
                                  placeholder="Partagez votre expérience..."
                                  value={review}
                                  onChange={(e) => setReview(e.target.value)}
                                />
                              </div>
                              <Button 
                                onClick={handleRateDelivery}
                                className="w-full"
                              >
                                ⭐ Publier l'évaluation
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}