'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Download, 
  FileText, 
  Calendar,
  User,
  CreditCard,
  Package,
  ArrowLeft,
  Building2
} from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  paymentMethod?: string
  stripePaymentId?: string
  refundAmount?: number
  createdAt: string
  metadata?: {
    type?: string
    description?: string
  }
  user?: {
    name?: string
    email?: string
  }
  delivery?: {
    id: string
    announcement?: {
      title?: string
      description?: string
    }
  }
  booking?: {
    id: string
    service?: {
      name?: string
      description?: string
    }
  }
}

interface InvoicePageProps {
  params: {
    locale: string
    paymentId: string
  }
}

export default function InvoicePage({
  params
}: InvoicePageProps) {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const response = await fetch(`/api/client/payments/${params.paymentId}/details`)
        if (response.ok) {
          const data = await response.json()
          setPayment(data)
        } else if (response.status === 404) {
          router.push('/fr/client/payments')
        }
      } catch (error) {
        console.error('Error fetching payment:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPayment()
  }, [params.paymentId, router])

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Chargement...</div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Paiement non trouvé</div>
      </div>
    )
  }

  const statusConfig = {
    PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    COMPLETED: { label: 'Terminé', color: 'bg-green-100 text-green-800 border-green-200' },
    FAILED: { label: 'Échoué', color: 'bg-red-100 text-red-800 border-red-200' },
    REFUNDED: { label: 'Remboursé', color: 'bg-blue-100 text-blue-800 border-blue-200' }
  }

  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const downloadInvoice = async () => {
    try {
      const response = await fetch(`/api/client/payments/${params.paymentId}/invoice`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `facture-${params.paymentId.slice(-8)}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erreur téléchargement:', error)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Facture #{payment.id.slice(-8).toUpperCase()}</h1>
            <p className="text-muted-foreground">
              Générée le {new Date(payment.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        
        <Button onClick={downloadInvoice} className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger
        </Button>
      </div>

      <div className="grid gap-6">
        {/* En-tête de facture */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                <div>
                  <CardTitle className="text-2xl">EcoDeli</CardTitle>
                  <p className="text-blue-100">Plateforme de livraison écologique</p>
                </div>
              </div>
              <Badge className={`${statusConfig[payment.status as keyof typeof statusConfig]?.color} text-lg px-4 py-2`}>
                {statusConfig[payment.status as keyof typeof statusConfig]?.label}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Informations principales */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{payment.user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{payment.user?.email || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informations facture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Détails facture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Date de paiement</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(payment.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Méthode de paiement</p>
                <p className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {payment.paymentMethod || 'Carte bancaire'}
                </p>
              </div>
              {payment.stripePaymentId && (
                <div>
                  <p className="text-sm text-muted-foreground">ID Stripe</p>
                  <p className="font-mono text-sm">{payment.stripePaymentId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Détails du service/livraison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Détails du paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{payment.metadata?.type || 'Paiement'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">
                  {payment.metadata?.description || `Paiement ${payment.amount}€`}
                </p>
              </div>

              {payment.delivery && (
                <div>
                  <p className="text-sm text-muted-foreground">Livraison</p>
                  <p className="font-medium">{payment.delivery.announcement?.title}</p>
                  {payment.delivery.announcement?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {payment.delivery.announcement.description}
                    </p>
                  )}
                </div>
              )}

              {payment.booking && (
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium">{payment.booking.service?.name}</p>
                  {payment.booking.service?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {payment.booking.service.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Montant */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Separator />
              
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">Montant total</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatAmount(payment.amount, payment.currency)}
                </span>
              </div>

              {payment.refundAmount && (
                <div className="flex items-center justify-between text-lg border-t pt-4">
                  <span className="font-medium text-blue-600">Montant remboursé</span>
                  <span className="text-xl font-bold text-blue-600">
                    +{formatAmount(payment.refundAmount, payment.currency)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p>EcoDeli - Plateforme de livraison écologique</p>
            <p>Cette facture a été générée automatiquement le {new Date().toLocaleDateString('fr-FR')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}