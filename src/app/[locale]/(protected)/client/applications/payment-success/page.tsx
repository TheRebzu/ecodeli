'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, CreditCard, User, Calendar, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentSuccessData {
  applicationId: string
  sessionId: string
  amount: number
  providerName: string
  serviceTitle: string
  status: 'success' | 'error' | 'loading'
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null)
  const [loading, setLoading] = useState(true)

  const sessionId = searchParams.get('session_id')
  const applicationId = searchParams.get('application_id')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !applicationId) {
        setPaymentData({
          applicationId: applicationId || '',
          sessionId: sessionId || '',
          amount: 0,
          providerName: '',
          serviceTitle: '',
          status: 'error'
        })
        setLoading(false)
        return
      }

      try {
        // Vérifier le paiement avec Stripe
        const response = await fetch('/api/client/applications/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId,
            applicationId
          })
        })

        if (response.ok) {
          const data = await response.json()
          setPaymentData({
            applicationId,
            sessionId,
            amount: data.amount,
            providerName: data.providerName,
            serviceTitle: data.serviceTitle,
            status: 'success'
          })
          
          toast.success('Paiement confirmé avec succès !')
        } else {
          setPaymentData({
            applicationId,
            sessionId,
            amount: 0,
            providerName: '',
            serviceTitle: '',
            status: 'error'
          })
          toast.error('Erreur lors de la vérification du paiement')
        }
      } catch (error) {
        console.error('Error verifying payment:', error)
        setPaymentData({
          applicationId,
          sessionId,
          amount: 0,
          providerName: '',
          serviceTitle: '',
          status: 'error'
        })
        toast.error('Erreur lors de la vérification du paiement')
      } finally {
        setLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId, applicationId])

  const handleGoToApplications = () => {
    router.push('/fr/client/applications')
  }

  const handleGoToDashboard = () => {
    router.push('/fr/client')
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Vérification du paiement...</h2>
              <p className="text-gray-600">Veuillez patienter pendant que nous vérifions votre paiement.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!paymentData || paymentData.status === 'error') {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-red-600 text-4xl mb-4">❌</div>
              <h2 className="text-xl font-semibold mb-2">Erreur de paiement</h2>
              <p className="text-gray-600 mb-6">
                Une erreur s'est produite lors de la vérification de votre paiement.
              </p>
              <div className="space-y-3">
                <Button onClick={handleGoToApplications} className="w-full">
                  Retour aux candidatures
                </Button>
                <Button variant="outline" onClick={handleGoToDashboard} className="w-full">
                  Retour au tableau de bord
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-2xl">Paiement confirmé !</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-600">Détails du paiement</span>
              </div>
              <p className="text-sm text-green-700">
                <strong>Montant:</strong> {paymentData.amount.toFixed(2)}€
              </p>
              <p className="text-sm text-green-700">
                <strong>Statut:</strong> Confirmé
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Prochaines étapes</h3>
              <ul className="text-sm text-gray-600 space-y-2 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Le prestataire a été notifié de votre paiement
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Vous recevrez une confirmation par email
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Le prestataire vous contactera pour organiser l'intervention
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Vous pouvez suivre l'avancement dans votre espace client
                </li>
              </ul>
            </div>

            <div className="space-y-3 pt-6">
              <Button onClick={handleGoToApplications} className="w-full">
                Voir mes candidatures
              </Button>
              <Button variant="outline" onClick={handleGoToDashboard} className="w-full">
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 