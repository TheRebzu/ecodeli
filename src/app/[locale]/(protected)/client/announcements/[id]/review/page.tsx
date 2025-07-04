'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Star,
  CheckCircle,
  AlertTriangle,
  Truck,
  Clock,
  MessageCircle,
  Package
} from 'lucide-react'

interface ReviewData {
  announcement: {
    id: string
    title: string
    status: string
    createdAt: string
    delivery: {
      id: string
      deliverer: {
        id: string
        name: string
        avatar?: string
        averageRating: number
        totalDeliveries: number
      }
      acceptedPrice: number
      completedAt: string
    }
  }
  existingReview?: {
    id: string
    rating: number
    comment: string
    createdAt: string
  }
}

export default function ReviewPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  
  // Form state
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (id) {
      fetchReviewData()
    }
  }, [id])

  const fetchReviewData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/announcements/${id}/review`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setReviewData(data)
        
        // Si une évaluation existe déjà, pré-remplir le formulaire
        if (data.existingReview) {
          setRating(data.existingReview.rating)
          setComment(data.existingReview.comment)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Impossible de charger les données')
      }
    } catch (err) {
      console.error('❌ Erreur chargement évaluation:', err)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert('Veuillez sélectionner une note')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/client/announcements/${id}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim()
        })
      })
      
      if (response.ok) {
        alert('Évaluation envoyée avec succès !')
        router.push(`/client/announcements/${id}`)
      } else {
        const errorData = await response.json()
        alert(`Erreur: ${errorData.error || 'Impossible d\'envoyer l\'évaluation'}`)
      }
    } catch (err) {
      console.error('❌ Erreur envoi évaluation:', err)
      alert('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (currentRating: number, isInteractive: boolean = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 transition-colors ${
              star <= (isInteractive ? (hoveredRating || rating) : currentRating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${isInteractive ? 'cursor-pointer hover:scale-110' : ''}`}
            onClick={isInteractive ? () => setRating(star) : undefined}
            onMouseEnter={isInteractive ? () => setHoveredRating(star) : undefined}
            onMouseLeave={isInteractive ? () => setHoveredRating(0) : undefined}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !reviewData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Erreur
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "Impossible de charger les données d'évaluation."}
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

  const { announcement, existingReview } = reviewData
  const deliverer = announcement.delivery.deliverer

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {existingReview ? 'Modifier l\'évaluation' : 'Évaluer le livreur'}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire d'évaluation */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                {existingReview ? 'Modifier votre évaluation' : 'Votre évaluation'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Note */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Note générale <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  {renderStars(rating, true)}
                  <span className="text-sm text-gray-600">
                    {rating > 0 ? `${rating}/5 étoiles` : 'Cliquez pour noter'}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Commentaire */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Commentaire (optionnel)
                </label>
                <Textarea
                  placeholder="Partagez votre expérience avec ce livreur..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Votre commentaire aidera les autres clients et permettra au livreur de s'améliorer.
                </p>
              </div>

              {/* Critères d'évaluation suggérés */}
              <div>
                <h4 className="font-medium mb-3">Critères d'évaluation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Ponctualité
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Soin du colis
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Communication
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Professionnalisme
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitting || rating === 0}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {existingReview ? 'Modification...' : 'Envoi...'}
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      {existingReview ? 'Modifier l\'évaluation' : 'Envoyer l\'évaluation'}
                    </>
                  )}
                </Button>
                <Link href={`/client/announcements/${id}`}>
                  <Button variant="outline">
                    Annuler
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informations livreur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Votre livreur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={deliverer.avatar} />
                  <AvatarFallback>
                    {deliverer.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="font-medium">{deliverer.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {deliverer.averageRating}/5 • {deliverer.totalDeliveries} livraisons
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Prix de la livraison</p>
                  <p className="text-sm text-gray-600">{announcement.delivery.acceptedPrice} EUR</p>
                </div>

                <div>
                  <p className="text-sm font-medium">Livraison terminée le</p>
                  <p className="text-sm text-gray-600">
                    {new Date(announcement.delivery.completedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Évaluation existante */}
          {existingReview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Évaluation actuelle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Note donnée</p>
                  {renderStars(existingReview.rating)}
                </div>

                {existingReview.comment && (
                  <div>
                    <p className="text-sm font-medium mb-2">Votre commentaire</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      "{existingReview.comment}"
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium">Évaluée le</p>
                  <p className="text-sm text-gray-600">
                    {new Date(existingReview.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Votre évaluation est importante pour la communauté EcoDeli et aide les livreurs à s'améliorer.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
} 