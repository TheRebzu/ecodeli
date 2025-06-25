import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PaymentProvider } from '@/components/payments/payment-provider'
import { StripeService } from '@/features/payments/services/stripe.service'

interface PaymentPageProps {
  params: {
    locale: string
    deliveryId: string
  }
}

export async function generateMetadata({
  params: { locale }
}: PaymentPageProps): Promise<Metadata> {
  return {
    title: 'Paiement - EcoDeli',
    description: 'Paiement sécurisé pour votre livraison'
  }
}

export default async function PaymentPage({
  params: { locale, deliveryId }
}: PaymentPageProps) {
  const session = await auth.api.getSession({
    headers: await import('next/headers').then(mod => mod.headers())
  })

  if (!session?.user) {
    redirect(`/${locale}/login`)
  }

  // Vérifier que la livraison existe et appartient à l'utilisateur
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      announcement: true,
      client: {
        include: {
          user: true
        }
      },
      payment: true
    }
  })

  if (!delivery || delivery.client.userId !== session.user.id) {
    notFound()
  }

  // Vérifier que le paiement n'est pas déjà complété
  if (delivery.payment?.status === 'COMPLETED') {
    redirect(`/${locale}/client/deliveries/${deliveryId}`)
  }

  try {
    // Créer ou récupérer le PaymentIntent
    const paymentIntent = await StripeService.createDeliveryPaymentIntent(
      deliveryId,
      session.user.id
    )

    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">
              Paiement de votre livraison
            </h1>
            <p className="text-muted-foreground">
              {delivery.announcement.title}
            </p>
          </div>

          <PaymentProvider
            clientSecret={paymentIntent.clientSecret}
            amount={paymentIntent.amount / 100} // Convertir centimes en euros
            currency={paymentIntent.currency}
            description={delivery.announcement.title}
            onSuccess={() => {
              window.location.href = `/${locale}/client/deliveries/${deliveryId}/payment-success`
            }}
            onError={(error) => {
              console.error('Erreur paiement:', error)
              // TODO: Gérer l'erreur
            }}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Erreur création PaymentIntent:', error)
    notFound()
  }
}