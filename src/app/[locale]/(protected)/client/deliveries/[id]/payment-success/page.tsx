import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PaymentSuccess } from '@/components/payments/payment-success'

interface PaymentSuccessPageProps {
  params: {
    locale: string
    id: string
  }
  searchParams: {
    payment_intent?: string
  }
}

export async function generateMetadata({
  params: { locale }
}: PaymentSuccessPageProps): Promise<Metadata> {
  return {
    title: 'Paiement confirmé - EcoDeli',
    description: 'Votre paiement a été confirmé avec succès'
  }
}

export default async function PaymentSuccessPage({
  params: { locale, id },
  searchParams: { payment_intent }
}: PaymentSuccessPageProps) {
  const session = await auth.api.getSession({
    headers: await import('next/headers').then(mod => mod.headers())
  })

  if (!session?.user) {
    redirect(`/${locale}/login`)
  }

  // Vérifier la livraison et le paiement
  const delivery = await prisma.delivery.findUnique({
    where: { id },
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

  if (!delivery.payment || delivery.payment.status !== 'COMPLETED') {
    redirect(`/${locale}/client/payments/${id}`)
  }

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <PaymentSuccess
        paymentIntentId={payment_intent || delivery.payment.stripePaymentId || undefined}
        amount={delivery.payment.amount}
        currency={delivery.payment.currency}
        description={delivery.announcement.title}
        type="delivery"
        entityId={id}
      />
    </Suspense>
  )
}