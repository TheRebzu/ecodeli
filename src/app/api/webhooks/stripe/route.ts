// Webhook Stripe pour traiter les �v�nements de paiement EcoDeli
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { db as prisma } from '@/lib/db'
import { OneSignalService } from '@/lib/onesignal'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Traitement des �v�nements Stripe
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute)
        break

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
      include: {
        user: true,
        client: { include: { user: true } },
        delivery: {
          include: {
            announcement: true,
            deliverer: { include: { user: true } }
          }
        },
        booking: {
          include: {
            service: true,
            provider: { include: { user: true } }
          }
        }
      }
    })

    if (!payment) {
      console.error('Payment not found:', paymentIntent.id)
      return
    }

    // Mettre � jour le statut du paiement
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        metadata: {
          ...payment.metadata,
          stripeEvent: 'payment_intent.succeeded',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        }
      }
    })

    // Traitement sp�cifique selon le type de paiement
    if (payment.delivery) {
      await handleDeliveryPaymentSucceeded(payment, paymentIntent)
    } else if (payment.booking) {
      await handleBookingPaymentSucceeded(payment, paymentIntent)
    }

    // Notification � l'utilisateur
    await OneSignalService.notifyPaymentReceived(
      payment.userId,
      paymentIntent.amount / 100,
      payment.delivery ? 'livraison' : 'service',
      payment.delivery ? 'delivery' : 'booking'
    )

    // Log d'activit�
    await prisma.activityLog.create({
      data: {
        userId: payment.userId,
        action: 'PAYMENT_RECEIVED',
        entityType: payment.delivery ? 'DELIVERY' : 'BOOKING',
        entityId: payment.delivery?.id || payment.booking?.id || payment.id,
        metadata: {
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          stripePaymentId: paymentIntent.id
        }
      }
    })

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handleDeliveryPaymentSucceeded(payment: any, paymentIntent: Stripe.PaymentIntent) {
  const delivery = payment.delivery
  const amount = paymentIntent.amount / 100

  // Calculer les commissions
  const platformFee = amount * 0.15 // 15% pour la plateforme
  const delivererFee = amount - platformFee

  // Mettre � jour la livraison
  await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      delivererFee,
      platformFee,
      status: 'ACCEPTED' // Le livreur peut maintenant commencer
    }
  })

  // Cr�diter le portefeuille du livreur
  await prisma.walletOperation.create({
    data: {
              walletId: delivery.deliverer?.wallet?.id || '',
        userId: delivery.deliverer?.id || '',
      type: 'CREDIT',
      amount: delivererFee,
      description: `Paiement livraison: ${delivery.announcement.title}`,
      reference: delivery.id,
      status: 'COMPLETED',
      executedAt: new Date()
    }
  })

  // Mettre � jour le solde du portefeuille
  await prisma.wallet.update({
          where: { userId: delivery.deliverer?.id || '' },
    data: {
      balance: {
        increment: delivererFee
      }
    }
  })

  // Notification au livreur
  await OneSignalService.notifyPaymentReceived(
          delivery.deliverer?.id || '',
    delivererFee,
    `Livraison: ${delivery.announcement.title}`,
    'delivery'
  )

  // Notification au client
  await OneSignalService.notifyDeliveryUpdate(
    delivery.clientId,
    delivery.id,
    'PAYMENT_CONFIRMED',
    'Votre paiement a �t� confirm�. Le livreur va maintenant r�cup�rer votre colis.'
  )
}

async function handleBookingPaymentSucceeded(payment: any, paymentIntent: Stripe.PaymentIntent) {
  const booking = payment.booking
  const amount = paymentIntent.amount / 100

  // Calculer les commissions
  const platformFee = amount * 0.15 // 15% pour la plateforme
  const providerFee = amount - platformFee

  // Mettre � jour la r�servation
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'CONFIRMED'
    }
  })

  // Le paiement du prestataire sera trait� lors de la facturation mensuelle
  // On cr�e juste un record pour le tracking
  await prisma.walletOperation.create({
    data: {
      walletId: booking.provider.user.wallet?.id || '',
      userId: booking.provider.user.id,
      type: 'CREDIT',
      amount: providerFee,
      description: `R�servation: ${booking.service.name}`,
      reference: booking.id,
      status: 'PENDING', // Sera pay� en fin de mois
    }
  })

  // Notification au prestataire
  await OneSignalService.notifyNewBooking(
    booking.provider.user.id,
    booking.id,
    booking.service.name,
    booking.client.user.name || 'Client',
    booking.scheduledDate.toLocaleDateString('fr-FR'),
    amount
  )
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
      include: { user: true }
    })

    if (!payment) return

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        metadata: {
          ...payment.metadata,
          stripeEvent: 'payment_intent.payment_failed',
          error: paymentIntent.last_payment_error?.message
        }
      }
    })

    // Notification � l'utilisateur
    await OneSignalService.sendToUser(
      payment.userId,
      'Paiement �chou�',
      `Votre paiement de ${paymentIntent.amount / 100}� a �chou�. Veuillez r�essayer.`,
      {
        type: 'payment_failed',
        paymentId: payment.id,
        amount: paymentIntent.amount / 100
      }
    )

  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    
    // Trouver l'utilisateur par customer ID Stripe
    const user = await prisma.user.findFirst({
      where: {
        client: {
          stripeCustomerId: customerId
        }
      },
      include: { client: true }
    })

    if (!user || !user.client) return

    // D�terminer le plan d'abonnement
    const plan = subscription.items.data[0]?.price.lookup_key || 'STARTER'

    // Mettre � jour l'abonnement client
    await prisma.client.update({
      where: { id: user.client.id },
      data: {
        subscriptionPlan: plan.toUpperCase() as any,
        subscriptionStart: new Date(subscription.current_period_start * 1000),
        subscriptionEnd: new Date(subscription.current_period_end * 1000)
      }
    })

    // Notification de bienvenue
    await OneSignalService.sendToUser(
      user.id,
      '<� Abonnement activ�',
      `Votre abonnement ${plan} est maintenant actif !`,
      {
        type: 'subscription_activated',
        plan
      }
    )

  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    
    const user = await prisma.user.findFirst({
      where: {
        client: {
          stripeCustomerId: customerId
        }
      },
      include: { client: true }
    })

    if (!user || !user.client) return

    const plan = subscription.items.data[0]?.price.lookup_key || 'STARTER'

    await prisma.client.update({
      where: { id: user.client.id },
      data: {
        subscriptionPlan: plan.toUpperCase() as any,
        subscriptionEnd: new Date(subscription.current_period_end * 1000)
      }
    })

  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    
    const user = await prisma.user.findFirst({
      where: {
        client: {
          stripeCustomerId: customerId
        }
      },
      include: { client: true }
    })

    if (!user || !user.client) return

    await prisma.client.update({
      where: { id: user.client.id },
      data: {
        subscriptionPlan: 'FREE',
        subscriptionEnd: new Date()
      }
    })

    await OneSignalService.sendToUser(
      user.id,
      'Abonnement annul�',
      'Votre abonnement a �t� annul�. Vous avez �t� r�trograd� au plan gratuit.',
      {
        type: 'subscription_cancelled'
      }
    )

  } catch (error) {
    console.error('Error handling subscription cancelled:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Traitement des factures pay�es (abonnements, etc.)
  console.log('Invoice payment succeeded:', invoice.id)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Traitement des �checs de paiement de factures
  console.log('Invoice payment failed:', invoice.id)
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  // Notifier les admins d'un litige
  await OneSignalService.sendWithFilters(
    [{ field: 'tag', key: 'role', relation: '=', value: 'ADMIN' }],
    '� Nouveau litige',
    `Un litige de ${dispute.amount / 100}� a �t� ouvert (${dispute.reason})`,
    {
      type: 'charge_dispute',
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      reason: dispute.reason
    }
  )
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  // Log des transferts vers les comptes connect�s
  console.log('Transfer created:', transfer.id, transfer.amount / 100)
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  // Traitement des virements effectu�s
  console.log('Payout paid:', payout.id, payout.amount / 100)
}