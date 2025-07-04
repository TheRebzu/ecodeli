"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, CheckCircle, ArrowLeft, Package, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

interface ValidationCodeData {
  announcement: {
    id: string
    title: string
    description: string
    status: string
  }
  delivery: {
    id: string
    status: string
    validationCode: string
    deliverer: {
      id: string
      name: string
      phone?: string
      avatar?: string
    }
  }
}

export default function ValidationCodePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()
  const t = useTranslations('client.announcements')
  const { toast } = useToast()
  
  const [data, setData] = useState<ValidationCodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (id && user) {
      fetchValidationCode()
    }
  }, [id, user])

  const fetchValidationCode = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/client/announcements/${id}/validation-code`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Code de validation non trouvé')
      }

      const responseData = await response.json()
      setData(responseData)
    } catch (err: any) {
      console.error('❌ Erreur chargement code:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!data?.delivery.validationCode) return

    try {
      await navigator.clipboard.writeText(data.delivery.validationCode)
      setCopied(true)
      toast({
        title: "Code copié",
        description: "Le code de validation a été copié dans le presse-papiers",
      })
      
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du code de validation...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Code non disponible
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "Le code de validation n'est pas encore disponible."}
          </p>
          <Link href={`/client/announcements/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'annonce
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Code de validation"
        description="Code nécessaire pour confirmer la réception de votre livraison"
        action={
          <Link href={`/client/announcements/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Code de validation principal */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Code de validation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-4xl font-bold text-blue-600 mb-2 tracking-widest">
                {data.delivery.validationCode}
              </div>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier le code
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important :</strong> Communiquez ce code uniquement au livreur 
                lors de la réception de votre colis pour confirmer la livraison.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informations sur l'annonce */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Détails de la livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Annonce</h4>
              <p className="text-gray-600">{data.announcement.title}</p>
              <Badge variant="outline" className="mt-1">
                {data.announcement.status}
              </Badge>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Description</h4>
              <p className="text-gray-600 text-sm">{data.announcement.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Informations sur le livreur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Votre livreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                {data.delivery.deliverer.avatar ? (
                  <img 
                    src={data.delivery.deliverer.avatar} 
                    alt={data.delivery.deliverer.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-medium">
                    {data.delivery.deliverer.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {data.delivery.deliverer.name}
                </h4>
                {data.delivery.deliverer.phone && (
                  <p className="text-sm text-gray-600">
                    📞 {data.delivery.deliverer.phone}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <h3 className="font-medium text-green-900 mb-3">
              Comment utiliser le code de validation ?
            </h3>
            <ol className="text-sm text-green-800 space-y-2">
              <li className="flex gap-2">
                <span className="font-medium">1.</span>
                <span>Attendez l'arrivée du livreur à l'adresse convenue</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">2.</span>
                <span>Vérifiez l'identité du livreur</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">3.</span>
                <span>Réceptionnez votre colis et vérifiez son état</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">4.</span>
                <span>Communiquez le code de validation au livreur</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">5.</span>
                <span>La livraison sera automatiquement marquée comme terminée</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Actions supplémentaires */}
        <div className="flex gap-3 justify-center">
          <Link href={`/client/announcements/${id}/tracking`}>
            <Button variant="outline">
              Suivre la livraison
            </Button>
          </Link>
          <Link href={`/client/deliveries/${data.delivery.id}`}>
            <Button>
              Voir les détails
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 