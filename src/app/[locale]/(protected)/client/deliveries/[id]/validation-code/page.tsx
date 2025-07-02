'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  QrCode, 
  Copy, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User,
  RefreshCw,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'

interface ValidationCodeData {
  code: string
  deliveryId: string
  status: string
  expiresAt: string
  deliverer: {
    firstName: string
    lastName: string
    phone: string
  }
  announcement: {
    title: string
    deliveryAddress: string
  }
}

export default function ValidationCodePage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('client.delivery')
  const [validationData, setValidationData] = useState<ValidationCodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchValidationCode = async () => {
      try {
        const { id } = await params
        const response = await fetch(`/api/client/announcements/${id}/validation-code`)
        
        if (response.ok) {
          const data = await response.json()
          setValidationData(data)
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Erreur lors du chargement du code')
        }
      } catch (err) {
        setError('Erreur lors du chargement du code de validation')
      } finally {
        setLoading(false)
      }
    }

    fetchValidationCode()
  }, [params])

  const copyToClipboard = async () => {
    if (!validationData?.code) return
    
    try {
      await navigator.clipboard.writeText(validationData.code)
      setCopied(true)
      toast.success('Code copié dans le presse-papiers')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Impossible de copier le code')
    }
  }

  const regenerateCode = async () => {
    try {
      const { id } = await params
      const response = await fetch(`/api/client/announcements/${id}/validation-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Régénération demandée par le client' })
      })
      
      if (response.ok) {
        const data = await response.json()
        setValidationData(data)
        toast.success('Nouveau code généré avec succès')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erreur lors de la régénération')
      }
    } catch (err) {
      toast.error('Erreur lors de la régénération du code')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <Card>
              <CardContent className="py-12">
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-12 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!validationData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Alert>
            <AlertDescription>Aucune donnée de validation disponible</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const isExpired = new Date(validationData.expiresAt) < new Date()
  const timeRemaining = new Date(validationData.expiresAt).getTime() - Date.now()
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Code de Validation</h1>
          <p className="text-muted-foreground">
            Utilisez ce code pour valider la réception de votre livraison
          </p>
        </div>

        {/* Code de validation principal */}
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-amber-800">
              <Shield className="h-6 w-6" />
              Code de Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {/* Code principal */}
            <div className="bg-white border-2 border-amber-300 rounded-lg p-6 mx-auto max-w-xs">
              <span className="text-4xl font-mono font-bold text-amber-800 tracking-wider">
                {validationData.code}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-3">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex items-center gap-2"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier'}
              </Button>
              
              <Button
                onClick={regenerateCode}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Nouveau code
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">Instructions :</p>
              <ol className="text-left space-y-1 list-decimal list-inside">
                <li>Attendez que le livreur arrive chez vous</li>
                <li>Donnez ce code au livreur</li>
                <li>Le livreur saisira le code pour valider la livraison</li>
                <li>Votre paiement sera automatiquement débloqué</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Informations de livraison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Détails de la livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Livraison</h4>
              <p className="text-sm">{validationData.announcement.title}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Adresse de livraison</h4>
              <p className="text-sm">{validationData.announcement.deliveryAddress}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Livreur</h4>
              <p className="text-sm">
                {validationData.deliverer.firstName} {validationData.deliverer.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                Tél: {validationData.deliverer.phone}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Statut et expiration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Statut du code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant={isExpired ? "destructive" : "default"}>
                  {isExpired ? "Expiré" : "Valide"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {isExpired ? (
                  "Ce code a expiré"
                ) : (
                  `Expire dans ${hoursRemaining}h ${minutesRemaining}m`
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Sécurité :</strong> Ne partagez ce code qu'avec le livreur qui se présente chez vous. 
            Ce code est unique et ne peut être utilisé qu'une seule fois.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
} 