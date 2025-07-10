import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PaymentSuccess } from '@/components/payments/payment-success'

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Paiement confirmé - EcoDeli',
    description: 'Votre paiement a été confirmé avec succès'
  }
}

export default async function PaymentSuccessPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ payment_intent?: string }>
}) {
  const { locale, id } = await params
  const { payment_intent } = await searchParams

  const session = await auth()

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