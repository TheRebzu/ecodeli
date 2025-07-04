'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Truck,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  DollarSign,
  Eye
} from 'lucide-react'

interface Candidate {
  id: string
  deliverer: {
    id: string
    name: string
    avatar?: string
    averageRating: number
    totalDeliveries: number
    phone?: string
    vehicle?: {
      type: string
      model: string
      licensePlate: string
    }
  }
  proposedPrice: number
  estimatedPickupTime: string
  estimatedDeliveryTime: string
  message?: string
  createdAt: string
  route?: {
    distance: number
    duration: number
  }
}

interface CandidatesData {
  announcement: {
    id: string
    title: string
    status: string
    basePrice: number
    pickupAddress: string
    deliveryAddress: string
  }
  candidates: Candidate[]
}

export default function CandidatesPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [candidatesData, setCandidatesData] = useState<CandidatesData | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchCandidates()
    }
  }, [id])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/announcements/${id}/candidates`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setCandidatesData(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Impossible de charger les candidats')
      }
    } catch (err) {
      console.error('❌ Erreur chargement candidats:', err)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptCandidate = async (candidateId: string) => {
    try {
      setActionLoading(candidateId)
      const response = await fetch(`/api/client/announcements/${id}/candidates/${candidateId}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        alert('Candidat accepté ! La livraison peut maintenant commencer.')
        router.push(`/client/announcements/${id}`)
      } else {
        const errorData = await response.json()
        alert(`Erreur: ${errorData.error || 'Impossible d\'accepter le candidat'}`)
      }
    } catch (err) {
      console.error('❌ Erreur acceptation candidat:', err)
      alert('Erreur de connexion')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectCandidate = async (candidateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter ce candidat ?')) {
      return
    }

    try {
      setActionLoading(candidateId)
      const response = await fetch(`/api/client/announcements/${id}/candidates/${candidateId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        // Rafraîchir la liste
        await fetchCandidates()
        alert('Candidat rejeté')
      } else {
        const errorData = await response.json()
        alert(`Erreur: ${errorData.error || 'Impossible de rejeter le candidat'}`)
      }
    } catch (err) {
      console.error('❌ Erreur rejet candidat:', err)
      alert('Erreur de connexion')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des candidats...</p>
        </div>
      </div>
    )
  }

  if (error || !candidatesData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Erreur
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "Impossible de charger les candidats."}
          </p>
          <Link href={`/client/announcements/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux détails
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { announcement, candidates } = candidatesData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Candidats livreurs ({candidates.length})
          </h1>
          <p className="text-gray-600">
            Pour l'annonce: {announcement.title}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/client/announcements/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun candidat pour le moment
              </h3>
              <p className="text-gray-600 mb-4">
                Votre annonce est active mais aucun livreur ne s'est encore proposé.
              </p>
              <Alert className="max-w-md mx-auto">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Les livreurs recevront une notification dès qu'ils planifieront un trajet compatible avec votre annonce.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des candidats */}
          <div className="lg:col-span-2 space-y-4">
            {candidates.map((candidate) => (
              <Card 
                key={candidate.id} 
                className={`transition-all ${
                  selectedCandidate === candidate.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Informations livreur */}
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={candidate.deliverer.avatar} />
                        <AvatarFallback>
                          {candidate.deliverer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{candidate.deliverer.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                            {candidate.deliverer.averageRating}/5
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {candidate.deliverer.totalDeliveries} livraisons
                          </Badge>
                        </div>

                        {/* Prix proposé */}
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-600 text-lg">
                              {formatPrice(candidate.proposedPrice)}
                            </span>
                            {candidate.proposedPrice < announcement.basePrice && (
                              <Badge variant="destructive" className="text-xs">
                                -{Math.round(((announcement.basePrice - candidate.proposedPrice) / announcement.basePrice) * 100)}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Horaires */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <div>
                              <p className="font-medium">Récupération</p>
                              <p>{formatDate(candidate.estimatedPickupTime)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Truck className="h-4 w-4" />
                            <div>
                              <p className="font-medium">Livraison</p>
                              <p>{formatDate(candidate.estimatedDeliveryTime)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Véhicule si disponible */}
                        {candidate.deliverer.vehicle && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Truck className="h-4 w-4" />
                            <span>
                              {candidate.deliverer.vehicle.type} - {candidate.deliverer.vehicle.model}
                            </span>
                          </div>
                        )}

                        {/* Distance/durée si disponible */}
                        {candidate.route && (
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{candidate.route.distance} km</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{Math.round(candidate.route.duration / 60)} min</span>
                            </div>
                          </div>
                        )}

                        {/* Message du livreur */}
                        {candidate.message && (
                          <div className="bg-gray-50 p-3 rounded-lg mb-3">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="h-4 w-4 text-gray-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                  Message du livreur :
                                </p>
                                <p className="text-sm text-gray-600">
                                  "{candidate.message}"
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Date de candidature */}
                        <p className="text-xs text-gray-500">
                          Candidature reçue le {formatDate(candidate.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleAcceptCandidate(candidate.id)}
                        disabled={actionLoading === candidate.id}
                        className="min-w-[100px]"
                      >
                        {actionLoading === candidate.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accepter
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => handleRejectCandidate(candidate.id)}
                        disabled={actionLoading === candidate.id}
                        className="min-w-[100px]"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>

                      {candidate.deliverer.phone && (
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4 mr-2" />
                          Contacter
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCandidate(
                          selectedCandidate === candidate.id ? null : candidate.id
                        )}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informations annonce */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Votre annonce
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Prix de base</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatPrice(announcement.basePrice)}
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Itinéraire</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      <p className="font-medium text-green-600">📍 Départ</p>
                      <p>{announcement.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="font-medium text-red-600">📍 Arrivée</p>
                      <p>{announcement.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conseils */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Conseils :</strong>
                <ul className="mt-2 text-sm space-y-1">
                  <li>• Vérifiez les évaluations du livreur</li>
                  <li>• Comparez les prix proposés</li>
                  <li>• Contactez le livreur si nécessaire</li>
                  <li>• Choisissez selon vos critères (prix, délai, évaluations)</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Statistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Candidatures reçues</span>
                  <Badge variant="secondary">{candidates.length}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Prix moyen proposé</span>
                  <span className="text-sm font-medium">
                    {formatPrice(
                      candidates.reduce((sum, c) => sum + c.proposedPrice, 0) / candidates.length
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Meilleur prix</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatPrice(Math.min(...candidates.map(c => c.proposedPrice)))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
} 