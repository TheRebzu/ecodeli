import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status: string
}

export interface PaymentMethod {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
}

export class StripeService {
  /**
   * Créer un Payment Intent pour une livraison
   */
  static async createDeliveryPaymentIntent(
    deliveryId: string,
    userId: string
  ): Promise<PaymentIntent> {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          announcement: true,
          client: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          },
          deliverer: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          }
        }
      })

      if (!delivery) {
        throw new Error('Livraison non trouvée')
      }

      if (delivery.clientId !== userId) {
        throw new Error('Accès non autorisé à cette livraison')
      }

      // Vérifier qu'il n'y a pas déjà un paiement en cours
      const existingPayment = await prisma.payment.findFirst({
        where: {
          deliveryId,
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      })

      if (existingPayment && existingPayment.stripePaymentId) {
        // Récupérer le PaymentIntent existant
        const existingIntent = await stripe.paymentIntents.retrieve(
          existingPayment.stripePaymentId
        )
        
        return {
          id: existingIntent.id,
          clientSecret: existingIntent.client_secret!,
          amount: existingIntent.amount,
          currency: existingIntent.currency,
          status: existingIntent.status
        }
      }

      // Calculer le montant (prix + frais de service)
      const baseAmount = delivery.price
      const serviceFee = Math.max(baseAmount * 0.05, 1) // 5% minimum 1€
      const totalAmount = baseAmount + serviceFee

      // Créer le PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Centimes
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          deliveryId,
          clientId: delivery.clientId,
          delivererId: delivery.delivererId,
          baseAmount: baseAmount.toString(),
          serviceFee: serviceFee.toString(),
          type: 'delivery'
        },
        description: `Paiement livraison - ${delivery.announcement.title}`,
        receipt_email: delivery.client.user.email
      })

      // Enregistrer le paiement en base
      await prisma.payment.upsert({
        where: { deliveryId },
        update: {
          stripePaymentId: paymentIntent.id,
          amount: totalAmount,
          status: 'PENDING'
        },
        create: {
          userId: userId,
          amount: totalAmount,
          currency: 'EUR',
          status: 'PENDING',
          type: 'DELIVERY',
          paymentMethod: 'CARD',
          clientId: delivery.clientId,
          deliveryId,
          stripePaymentId: paymentIntent.id,
          metadata: {
            baseAmount,
            serviceFee,
            delivererId: delivery.delivererId
          }
        }
      })

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }

    } catch (error) {
      console.error('Erreur création PaymentIntent:', error)
      throw new Error('Impossible de créer le paiement')
    }
  }

  /**
   * Créer un Payment Intent pour un abonnement client
   */
  static async createSubscriptionPaymentIntent(
    userId: string,
    planType: 'STARTER' | 'PREMIUM'
  ): Promise<PaymentIntent> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          client: true,
          profile: true
        }
      })

      if (!user || user.role !== 'CLIENT') {
        throw new Error('Utilisateur client non trouvé')
      }

      // Prix des abonnements
      const prices = {
        STARTER: 9.99, // €/mois
        PREMIUM: 19.99 // €/mois
      }

      const amount = prices[planType]

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId,
          planType,
          type: 'subscription'
        },
        description: `Abonnement ${planType} - EcoDeli`,
        receipt_email: user.email
      })

      // Enregistrer le paiement
      await prisma.payment.create({
        data: {
          userId: userId,
          amount,
          currency: 'EUR',
          status: 'PENDING',
          type: 'SUBSCRIPTION',
          paymentMethod: 'CARD',
          clientId: user.client!.id,
          stripePaymentId: paymentIntent.id,
          metadata: {
            planType,
            userId
          }
        }
      })

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }

    } catch (error) {
      console.error('Erreur création PaymentIntent abonnement:', error)
      throw error
    }
  }

  /**
   * Créer un Payment Intent pour une réservation de service
   */
  static async createBookingPaymentIntent(
    bookingId: string,
    userId: string
  ): Promise<PaymentIntent> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          service: {
            include: {
              provider: {
                include: {
                  user: {
                    include: {
                      profile: true
                    }
                  }
                }
              }
            }
          },
          client: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          }
        }
      })

      if (!booking) {
        throw new Error('Réservation non trouvée')
      }

      if (booking.clientId !== userId) {
        throw new Error('Accès non autorisé à cette réservation')
      }

      // Calculer le montant avec commission EcoDeli (15%)
      const baseAmount = booking.totalPrice
      const commission = baseAmount * 0.15
      const totalAmount = baseAmount

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingId,
          clientId: booking.clientId,
          providerId: booking.providerId,
          serviceId: booking.serviceId,
          baseAmount: baseAmount.toString(),
          commission: commission.toString(),
          type: 'booking'
        },
        description: `Paiement service - ${booking.service.name}`,
        receipt_email: booking.client.user.email
      })

      await prisma.payment.upsert({
        where: { bookingId },
        update: {
          stripePaymentId: paymentIntent.id,
          amount: totalAmount,
          status: 'PENDING'
        },
        create: {
          userId: userId,
          amount: totalAmount,
          currency: 'EUR',
          status: 'PENDING',
          type: 'SERVICE',
          paymentMethod: 'CARD',
          clientId: booking.clientId,
          bookingId,
          stripePaymentId: paymentIntent.id,
          metadata: {
            baseAmount,
            commission,
            providerId: booking.providerId,
            serviceId: booking.serviceId
          }
        }
      })

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }

    } catch (error) {
      console.error('Erreur création PaymentIntent réservation:', error)
      throw error
    }
  }

  /**
   * Créer un Payment Intent pour une location de storage box
   */
  static async createStorageRentalPaymentIntent({
    userId,
    clientId,
    storageBoxId,
    startDate,
    endDate,
    totalPrice,
    email,
    boxNumber,
    locationName
  }: {
    userId: string,
    clientId: string,
    storageBoxId: string,
    startDate: Date,
    endDate: Date,
    totalPrice: number,
    email: string,
    boxNumber: string,
    locationName: string
  }): Promise<PaymentIntent> {
    try {
      if (totalPrice <= 0) {
        throw new Error('Montant invalide pour le paiement')
      }

      // Créer le PaymentIntent Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalPrice * 100), // Centimes
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          storageBoxId,
          clientId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: 'storage_rental'
        },
        description: `Location box ${boxNumber} - ${locationName}`,
        receipt_email: email
      })

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    } catch (error) {
      console.error('Erreur création PaymentIntent storage:', error)
      throw new Error('Impossible de créer le paiement pour la location')
    }
  }

  /**
   * Traiter un webhook Stripe
   */
  static async handleWebhook(
    payload: string,
    signature: string
  ): Promise<{ processed: boolean; type: string }> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured')
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      )

      console.log('Webhook Stripe reçu:', event.type)

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
          break

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent)
          break

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent)
          break

        default:
          console.log(`Événement non géré: ${event.type}`)
      }

      return { processed: true, type: event.type }

    } catch (error) {
      console.error('Erreur traitement webhook:', error)
      throw error
    }
  }

  /**
   * Gérer un paiement réussi
   */
  private static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentId: paymentIntent.id },
        include: {
          delivery: {
            include: {
              announcement: true,
              client: true,
              deliverer: true
            }
          },
          booking: {
            include: {
              service: { include: { provider: true } },
              client: true
            }
          },
          storageRental: {
            include: {
              client: { include: { user: true } },
              storageBox: { include: { location: true } }
            }
          }
        }
      })

      if (!payment) {
        console.error('Paiement non trouvé pour PaymentIntent:', paymentIntent.id)
        return
      }

      await prisma.$transaction(async (tx) => {
        // Mettre à jour le paiement
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            metadata: {
              ...payment.metadata as any,
              stripeChargeId: paymentIntent.latest_charge
            }
          }
        })

        // Traitement spécifique selon le type
        if (payment.type === 'DELIVERY' && payment.delivery) {
          await this.processDeliveryPayment(tx, payment.delivery, payment.amount)
        } else if (payment.type === 'SERVICE' && payment.booking) {
          await this.processBookingPayment(tx, payment.booking, payment.amount)
          
          // Synchroniser automatiquement le statut de la réservation
          const { BookingSyncService } = await import('@/features/bookings/services/booking-sync.service')
          await BookingSyncService.syncBookingOnPaymentChange(updatedPayment.id, 'COMPLETED')
        } else if (payment.type === 'SUBSCRIPTION') {
          await this.processSubscriptionPayment(tx, payment)
        } else if (payment.type === 'STORAGE_RENTAL' && payment.storageRental) {
          await this.processStorageRentalPayment(tx, payment.storageRental, payment.amount)
        }
      })

      console.log(`Paiement traité avec succès: ${payment.id}`)

    } catch (error) {
      console.error('Erreur traitement paiement réussi:', error)
      throw error
    }
  }

  /**
   * Traiter le paiement d'une livraison
   */
  private static async processDeliveryPayment(tx: any, delivery: any, amount: number) {
    // Calculer la part du livreur (montant - frais de service)
    const metadata = delivery.payment?.metadata as any
    const baseAmount = metadata?.baseAmount || amount * 0.95
    const delivererAmount = baseAmount * 0.85 // 85% pour le livreur, 15% commission EcoDeli

    // Créditer le wallet du livreur
    if (delivery.deliverer.wallet) {
      await tx.wallet.update({
        where: { id: delivery.deliverer.wallet.id },
        data: {
          balance: { increment: delivererAmount },
          updatedAt: new Date()
        }
      })

      // Enregistrer la transaction wallet
      await tx.walletTransaction.create({
        data: {
          walletId: delivery.deliverer.wallet.id,
          type: 'CREDIT',
          amount: delivererAmount,
          description: `Paiement livraison - ${delivery.announcement.title}`,
          referenceId: delivery.id,
          balanceBefore: delivery.deliverer.wallet.balance,
          balanceAfter: delivery.deliverer.wallet.balance + delivererAmount
        }
      })
    }

    // Mettre à jour le statut de la livraison
    await tx.delivery.update({
      where: { id: delivery.id },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    // Notifications
    await tx.notification.createMany({
      data: [
        {
          userId: delivery.client.user.id,
          type: 'PAYMENT_CONFIRMED',
          title: 'Paiement confirmé',
          message: `Votre paiement de ${amount}€ pour la livraison "${delivery.announcement.title}" a été confirmé.`,
          data: { deliveryId: delivery.id, amount }
        },
        {
          userId: delivery.deliverer.user.id,
          type: 'PAYMENT_RECEIVED',
          title: 'Paiement reçu',
          message: `Vous avez reçu ${delivererAmount.toFixed(2)}€ pour la livraison "${delivery.announcement.title}".`,
          data: { deliveryId: delivery.id, amount: delivererAmount }
        }
      ]
    })
  }

  /**
   * Traiter le paiement d'une réservation
   */
  private static async processBookingPayment(tx: any, booking: any, amount: number) {
    const commission = amount * 0.15
    const providerAmount = amount - commission

    // Créditer le wallet du prestataire
    if (booking.service.provider.wallet) {
      await tx.wallet.update({
        where: { id: booking.service.provider.wallet.id },
        data: {
          balance: { increment: providerAmount },
          updatedAt: new Date()
        }
      })

      await tx.walletTransaction.create({
        data: {
          walletId: booking.service.provider.wallet.id,
          type: 'CREDIT',
          amount: providerAmount,
          description: `Paiement service - ${booking.service.name}`,
          referenceId: booking.id,
          balanceBefore: booking.service.provider.wallet.balance,
          balanceAfter: booking.service.provider.wallet.balance + providerAmount
        }
      })
    }

    // Note: Le statut de la réservation sera automatiquement synchronisé 
    // par BookingSyncService.syncBookingOnPaymentChange() dans handlePaymentSuccess

    // Notifications
    await tx.notification.createMany({
      data: [
        {
          userId: booking.client.user.id,
          type: 'BOOKING_CONFIRMED',
          title: 'Réservation confirmée',
          message: `Votre réservation pour "${booking.service.name}" a été confirmée.`,
          data: { bookingId: booking.id, amount }
        },
        {
          userId: booking.service.provider.user.id,
          type: 'BOOKING_PAID',
          title: 'Nouvelle réservation payée',
          message: `Une réservation pour "${booking.service.name}" a été confirmée et payée.`,
          data: { bookingId: booking.id, amount: providerAmount }
        }
      ]
    })
  }

  /**
   * Traiter le paiement d'un abonnement
   */
  private static async processSubscriptionPayment(tx: any, payment: any) {
    const metadata = payment.metadata as any
    const userId = metadata.userId
    const planType = metadata.planType

    // Mettre à jour l'abonnement client
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // Abonnement mensuel

    await tx.client.update({
      where: { userId },
      data: {
        subscriptionPlan: planType,
        subscriptionStart: new Date(),
        subscriptionEnd: endDate
      }
    })

    // Notification
    await tx.notification.create({
      data: {
        userId,
        type: 'SUBSCRIPTION_ACTIVATED',
        title: 'Abonnement activé',
        message: `Votre abonnement ${planType} a été activé avec succès.`,
        data: { planType, endDate }
      }
    })
  }

  /**
   * Gérer un paiement échoué
   */
  private static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    await prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        failedAt: new Date()
      }
    })
  }

  /**
   * Gérer un paiement annulé
   */
  private static async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    await prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntent.id },
      data: { status: 'CANCELLED' }
    })
  }

  /**
   * Traiter un paiement de location de box de stockage
   */
  private static async processStorageRentalPayment(tx: any, rental: any, amount: number) {
    try {
      // Mettre à jour le statut de la location
      await tx.storageBoxRental.update({
        where: { id: rental.id },
        data: {
          status: 'ACTIVE',
          paidAt: new Date()
        }
      })

      // Mettre à jour le statut de la box
      await tx.storageBox.update({
        where: { id: rental.storageBoxId },
        data: {
          status: 'OCCUPIED'
        }
      })

      console.log(`Paiement location box traité: ${rental.id}`)

    } catch (error) {
      console.error('Erreur traitement paiement location box:', error)
      throw error
    }
  }

  /**
   * Rembourser un paiement
   */
  static async refundPayment(
    paymentId: string,
    reason: string,
    adminId: string
  ): Promise<{ success: boolean; refundId?: string }> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
      })

      if (!payment || !payment.stripePaymentId) {
        throw new Error('Paiement non trouvé')
      }

      if (payment.status !== 'COMPLETED') {
        throw new Error('Seuls les paiements complétés peuvent être remboursés')
      }

      // Créer le remboursement Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentId,
        reason: 'requested_by_customer',
        metadata: {
          adminId,
          reason,
          originalPaymentId: payment.id
        }
      })

      // Mettre à jour le paiement
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          metadata: {
            ...payment.metadata as any,
            refundId: refund.id,
            refundReason: reason,
            refundedBy: adminId
          }
        }
      })

      return { success: true, refundId: refund.id }

    } catch (error) {
      console.error('Erreur remboursement:', error)
      return { success: false }
    }
  }

  /**
   * Obtenir les statistiques de paiement
   */
  static async getPaymentStats(startDate?: Date, endDate?: Date) {
    const where = {
      status: 'COMPLETED',
      ...(startDate && endDate && {
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      })
    }

    const [totalAmount, totalCount, byType] = await Promise.all([
      prisma.payment.aggregate({
        where,
        _sum: { amount: true }
      }),
      prisma.payment.count({ where }),
      prisma.payment.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true
      })
    ])

    return {
      totalAmount: totalAmount._sum.amount || 0,
      totalCount,
      byType: byType.map(item => ({
        type: item.type,
        amount: item._sum.amount || 0,
        count: item._count
      }))
    }
  }
}