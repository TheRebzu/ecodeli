"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Package, 
  Clock,
  MapPin,
  User,
  Phone,
  MessageCircle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

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
  delivery?: {
    id: string
    status: string
    validationCode?: string
    deliverer?: {
      id: string
      name: string
      profile?: {
        firstName: string
        lastName: string
        phone?: string
      }
    }
    proofOfDelivery?: {
      photos?: string[]
      notes?: string
      createdAt: string
    }
  }
  attachments?: any[]
}

export default function AnnouncementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [showProblemDialog, setShowProblemDialog] = useState(false)
  const [validationCode, setValidationCode] = useState('')
  const [problemReason, setProblemReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchAnnouncement(params.id as string)
    }
  }, [params.id])

  // Rafraîchir automatiquement les données de livraison en cours
  useEffect(() => {
    if (announcement?.delivery?.status === 'IN_TRANSIT') {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh: Livraison en cours')
        fetchAnnouncement(params.id as string)
      }, 30000) // Rafraîchir toutes les 30 secondes

      return () => clearInterval(interval)
    }
  }, [announcement?.delivery?.status, params.id])

  const fetchAnnouncement = async (id: string) => {
    try {
      setLoading(true)
      console.log('🔄 Fetching announcement:', id)
      
      const response = await fetch(`/api/client/announcements/${id}`)
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error('Annonce non trouvée')
      }

      const data = await response.json()
      console.log('📦 Announcement data:', data)
      
      if (data.delivery) {
        console.log('📋 Delivery data:', {
          id: data.delivery.id,
          status: data.delivery.status,
          validationCode: data.delivery.validationCode
        })
      }
      
      setAnnouncement(data)
    } catch (err) {
      console.error('❌ Error fetching announcement:', err)
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

  const validateDelivery = async () => {
    if (!announcement?.delivery?.id) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/client/deliveries/${announcement.delivery.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationCode })
      })

      if (response.ok) {
        toast.success('Livraison validée avec succès !')
        setShowValidationDialog(false)
        setValidationCode('')
        await fetchAnnouncement(params.id as string)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Code de validation incorrect')
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      toast.error('Erreur lors de la validation')
    } finally {
      setActionLoading(false)
    }
  }

  const reportProblem = async () => {
    if (!announcement?.delivery?.id) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/client/deliveries/${announcement.delivery.id}/report-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: problemReason })
      })

      if (response.ok) {
        toast.success('Problème signalé, notre équipe va vous contacter')
        setShowProblemDialog(false)
        setProblemReason('')
        await fetchAnnouncement(params.id as string)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erreur lors du signalement')
      }
    } catch (error) {
      console.error('Erreur lors du signalement:', error)
      toast.error('Erreur lors du signalement')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'MATCHED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
      'IN_TRANSIT': 'bg-yellow-100 text-yellow-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'COMPLETED': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'ACTIVE': 'Active',
      'MATCHED': 'Matchée',
      'IN_PROGRESS': 'En cours de livraison',
      'IN_TRANSIT': 'En cours de livraison',
      'DELIVERED': 'Livrée',
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(announcement.delivery?.status || announcement.status)}`}>
                  {getStatusLabel(announcement.delivery?.status || announcement.status)}
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

        {/* Section Livraison Terminée */}
        {announcement.delivery && announcement.delivery.status === 'DELIVERED' && (
          <Card className="mb-6 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                Livraison terminée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Livraison réussie !</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Votre colis a été livré avec succès. Merci d'avoir utilisé EcoDeli !
                  </p>
                </div>

                {announcement.delivery.deliverer && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Livreur</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {announcement.delivery.deliverer.profile?.firstName} {announcement.delivery.deliverer.profile?.lastName}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button 
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Validation de Livraison - Style Uber Eats */}
        {announcement.delivery && announcement.delivery.status === 'IN_TRANSIT' && (
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-600">
                <Package className="w-5 h-5 mr-2" />
                Validation de la livraison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Votre livreur arrive bientôt</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Le livreur va vous demander le code de validation pour confirmer la livraison.
                  </p>
                </div>

                {announcement.delivery.deliverer && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Livreur assigné</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {announcement.delivery.deliverer.profile?.firstName} {announcement.delivery.deliverer.profile?.lastName}
                      </span>
                      {announcement.delivery.deliverer.profile?.phone && (
                        <a 
                          href={`tel:${announcement.delivery.deliverer.profile.phone}`}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                        >
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">Appeler</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Code de validation</span>
                  </div>
                  
                  {/* Debug info */}
                  <div className="mb-3 p-2 bg-gray-100 rounded text-xs">
                    <div>Status: {announcement.delivery?.status}</div>
                    <div>Validation Code: {announcement.delivery?.validationCode || 'NULL'}</div>
                    <div>Has Code: {announcement.delivery?.validationCode ? 'YES' : 'NO'}</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-yellow-800 bg-white p-3 rounded border-2 border-yellow-200">
                      {announcement.delivery.validationCode || 'XXXXXX'}
                    </div>
                    <p className="text-sm text-yellow-700 mt-2">
                      Donnez ce code au livreur pour confirmer la réception
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setShowValidationDialog(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer la livraison
                  </Button>
                  <Button 
                    onClick={() => setShowProblemDialog(true)}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preuve de livraison si disponible */}
        {announcement.delivery?.proofOfDelivery && (
          <Card className="mb-6 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                Preuve de livraison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {announcement.delivery.proofOfDelivery.photos && announcement.delivery.proofOfDelivery.photos.length > 0 && (
                  <div>
                    <img 
                      src={announcement.delivery.proofOfDelivery.photos[0]} 
                      alt="Preuve de livraison"
                      className="w-full max-w-md rounded-lg border"
                    />
                  </div>
                )}
                {announcement.delivery.proofOfDelivery.notes && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700">{announcement.delivery.proofOfDelivery.notes}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Livré le {new Date(announcement.delivery.proofOfDelivery.createdAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* Dialog de validation */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la livraison</DialogTitle>
            <DialogDescription>
              Entrez le code de validation fourni par le livreur pour confirmer la réception
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Code à 6 chiffres"
              value={validationCode}
              onChange={(e) => setValidationCode(e.target.value)}
              className="text-center font-mono text-lg"
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={validateDelivery}
              disabled={!validationCode.trim() || validationCode.length !== 6 || actionLoading}
            >
              {actionLoading ? 'Validation...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de signalement de problème */}
      <Dialog open={showProblemDialog} onOpenChange={setShowProblemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
            <DialogDescription>
              Décrivez le problème rencontré avec cette livraison
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Décrivez le problème (ex: colis endommagé, livreur en retard, mauvaise adresse...)"
              value={problemReason}
              onChange={(e) => setProblemReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProblemDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={reportProblem}
              disabled={!problemReason.trim() || actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? 'Envoi...' : 'Signaler'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 