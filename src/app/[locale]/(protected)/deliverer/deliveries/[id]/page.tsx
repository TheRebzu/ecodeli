'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  MapPin, 
  Clock, 
  Package, 
  Phone, 
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  QrCode
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DeliveryDetails {
  id: string
  status: string
  price: number
  delivererFee: number
  validationCode: string | null
  announcement: {
    title: string
    description: string
    type: string
    pickupAddress: string
    deliveryAddress: string
    pickupDate: string | null
    deliveryDate: string | null
  }
  client: {
    profile: {
      firstName: string | null
      lastName: string | null
      phone: string | null
    }
  }
}

export default function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('deliverer.deliveries')
  const router = useRouter()
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationCode, setValidationCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    const fetchDeliveryDetails = async () => {
      try {
        const { id } = await params
        const response = await fetch(`/api/deliverer/deliveries/${id}`)
        
        if (response.ok) {
          const data = await response.json()
          setDelivery(data.delivery)
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Erreur lors du chargement de la livraison')
        }
      } catch (err) {
        setError('Erreur lors du chargement de la livraison')
      } finally {
        setLoading(false)
      }
    }

    fetchDeliveryDetails()
  }, [params])

  const handleValidation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validationCode || validationCode.length !== 6) {
      toast.error('Le code de validation doit contenir exactement 6 chiffres')
      return
    }

    try {
      setValidating(true)
      setValidationResult(null)
      
      const { id } = await params
      const response = await fetch(`/api/deliverer/deliveries/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validationCode })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setValidationResult({
          success: true,
          message: 'Livraison validée avec succès ! Le paiement a été débloqué.'
        })
        toast.success('Livraison validée avec succès !')
        setValidationCode('')
        
        // Rediriger vers la page des livraisons actives après 3 secondes
        setTimeout(() => {
          router.push('/fr/deliverer/deliveries/active')
        }, 3000)
      } else {
        setValidationResult({
          success: false,
          message: result.error || 'Erreur lors de la validation'
        })
        toast.error(result.error || 'Erreur lors de la validation')
      }
    } catch (err) {
      setValidationResult({
        success: false,
        message: 'Erreur lors de la validation'
      })
      toast.error('Erreur lors de la validation')
    } finally {
      setValidating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="secondary">Acceptée</Badge>
      case 'IN_TRANSIT':
        return <Badge variant="default">En transit</Badge>
      case 'DELIVERED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Livrée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="py-8">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/fr/deliverer/deliveries/active">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux livraisons actives
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!delivery) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertDescription>Livraison introuvable</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Safety check for announcement
  if (!delivery.announcement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur: Les détails de l'annonce ne sont pas disponibles pour cette livraison.
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/fr/deliverer/deliveries/active">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux livraisons actives
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <Button asChild variant="outline" size="sm">
              <Link href="/fr/deliverer/deliveries/active">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <h1 className="text-3xl font-bold mt-4">Détails de la livraison</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {delivery.price ? delivery.price.toFixed(2) : '0.00'} €
            </div>
            <div className="text-sm text-muted-foreground">
              Votre part: {delivery.delivererFee ? delivery.delivererFee.toFixed(2) : '0.00'} €
            </div>
            {getStatusBadge(delivery.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations de la livraison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Titre</h4>
                <p className="text-sm">{delivery.announcement.title}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
                <p className="text-sm">{delivery.announcement.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Type</h4>
                <p className="text-sm">{delivery.announcement.type}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Nom</h4>
                <p className="text-sm">
                  {delivery.client.profile.firstName} {delivery.client.profile.lastName}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Téléphone</h4>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{delivery.client.profile.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adresse de collecte */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Collecte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Adresse</h4>
                <p className="text-sm">{delivery.announcement.pickupAddress}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Date prévue</h4>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {delivery.announcement.pickupDate ? (
                      <>
                        {new Date(delivery.announcement.pickupDate).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(delivery.announcement.pickupDate).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </>
                    ) : (
                      'Non spécifiée'
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adresse de livraison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Adresse</h4>
                <p className="text-sm">{delivery.announcement.deliveryAddress}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Date prévue</h4>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {delivery.announcement.deliveryDate ? (
                      <>
                        {new Date(delivery.announcement.deliveryDate).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(delivery.announcement.deliveryDate).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </>
                    ) : (
                      'Non spécifiée'
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulaire de validation */}
        {(delivery.status === 'IN_TRANSIT' || delivery.status === 'PICKED_UP' || delivery.status === 'ACCEPTED') && delivery.validationCode && (
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <QrCode className="h-5 w-5" />
                Validation de la livraison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationResult ? (
                <Alert variant={validationResult.success ? "default" : "destructive"}>
                  {validationResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{validationResult.message}</AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleValidation} className="space-y-4">
                  <div>
                    <label htmlFor="validationCode" className="block text-sm font-medium text-amber-800 mb-2">
                      Code de validation (6 chiffres)
                    </label>
                    <Input
                      id="validationCode"
                      type="text"
                      value={validationCode}
                      onChange={(e) => setValidationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="text-center text-xl font-mono border-amber-300"
                      disabled={validating}
                    />
                    <p className="text-xs text-amber-700 mt-1">
                      Demandez ce code au client lors de la remise
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={validationCode.length !== 6 || validating}
                    className="w-full"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validation en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Valider la livraison
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Affichage du code de validation si disponible */}
        {delivery.validationCode && delivery.status !== 'DELIVERED' && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <QrCode className="h-5 w-5" />
                Code de validation disponible (DEBUG)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-blue-900 mb-2">
                  {delivery.validationCode}
                </div>
                <p className="text-sm text-blue-700">
                  <strong>DEBUG :</strong> Ce code sera demandé au client lors de la remise
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions :</strong> Une fois arrivé chez le client, demandez le code de validation à 6 chiffres. 
            Saisissez ce code pour confirmer la livraison et débloquer le paiement.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
} 