import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { SUBSCRIPTION_PLANS, getSubscriptionPlan } from '@/config/subscription'
import { 
  UserSubscription, 
  CreateSubscriptionRequest, 
  SubscriptionUsage,
  SubscriptionPlan 
} from '@/features/payments/types/subscription.types'
// Types will be inferred from stripe instance

export class SubscriptionService {
  /**
   * Créer ou récupérer un client Stripe
   */
  static async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        profile: true,
        client: true
      }
    })

    if (!user) {
      throw new Error('Utilisateur non trouvé')
    }

    // Vérifier si le client a déjà un customer ID Stripe
    if (user.client?.stripeCustomerId) {
      return user.client.stripeCustomerId
    }

    // Créer un nouveau client Stripe
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : user.name || undefined,
      metadata: {
        userId,
        clientId: user.client?.id || ''
      }
    })

    // Sauvegarder le customer ID
    await prisma.client.update({
      where: { userId },
      data: {
        stripeCustomerId: customer.id
      }
    })

    return customer.id
  }

  /**
   * Créer un abonnement Stripe
   */
  static async createSubscription(
    userId: string, 
    request: CreateSubscriptionRequest
  ): Promise<UserSubscription> {
    try {
      const plan = getSubscriptionPlan(request.planId)
      if (!plan || !plan.stripePriceId) {
        throw new Error('Plan d\'abonnement invalide')
      }

      const customerId = await this.getOrCreateStripeCustomer(userId)

      // Récupérer l'abonnement actuel
      const currentClient = await prisma.client.findUnique({
        where: { userId },
        include: { user: true }
      })

      if (!currentClient) {
        throw new Error('Profil client non trouvé')
      }

      // Annuler l'abonnement existant s'il y en a un
      if (currentClient.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(currentClient.stripeSubscriptionId)
      }

      // Créer le nouvel abonnement
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: plan.stripePriceId
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          clientId: currentClient.id,
          planId: request.planId
        }
      })

      // Mettre à jour la base de données
      const updatedClient = await prisma.client.update({
        where: { id: currentClient.id },
        data: {
          subscriptionPlan: request.planId,
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(subscription.current_period_end * 1000),
          stripeSubscriptionId: subscription.id
        }
      })

      // Calculer les statistiques d'usage
      const usage = await this.calculateUsageStats(userId)

      return {
        id: updatedClient.id,
        userId,
        plan: request.planId,
        status: subscription.status === 'active' ? 'active' : 'inactive',
        startDate: updatedClient.subscriptionStart,
        endDate: updatedClient.subscriptionEnd,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        autoRenew: true,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        usage
      }

    } catch (error) {
      console.error('Erreur création abonnement:', error)
      throw new Error('Impossible de créer l\'abonnement')
    }
  }

  /**
   * Mettre à jour un abonnement
   */
  static async updateSubscription(
    userId: string,
    newPlanId: 'FREE' | 'STARTER' | 'PREMIUM'
  ): Promise<UserSubscription> {
    try {
      const client = await prisma.client.findUnique({
        where: { userId },
        include: { user: true }
      })

      if (!client) {
        throw new Error('Client non trouvé')
      }

      let updatedClient

      if (newPlanId === 'FREE') {
        // Passer au plan gratuit = annuler l'abonnement Stripe
        if (client.stripeSubscriptionId) {
          await stripe.subscriptions.cancel(client.stripeSubscriptionId)
        }

        updatedClient = await prisma.client.update({
          where: { id: client.id },
          data: {
            subscriptionPlan: 'FREE',
            subscriptionEnd: new Date(),
            stripeSubscriptionId: null
          }
        })
      } else {
        // Changer vers un plan payant
        const newPlan = getSubscriptionPlan(newPlanId)
        if (!newPlan || !newPlan.stripePriceId) {
          throw new Error('Plan invalide')
        }

        if (client.stripeSubscriptionId) {
          // Modifier l'abonnement existant
          const subscription = await stripe.subscriptions.update(
            client.stripeSubscriptionId,
            {
              items: [{
                id: client.stripeSubscriptionId,
                price: newPlan.stripePriceId
              }],
              proration_behavior: 'create_prorations'
            }
          )

          updatedClient = await prisma.client.update({
            where: { id: client.id },
            data: {
              subscriptionPlan: newPlanId,
              subscriptionEnd: new Date(subscription.current_period_end * 1000)
            }
          })
        } else {
          // Créer un nouvel abonnement
          return await this.createSubscription(userId, {
            planId: newPlanId,
            paymentMethodId: '' // Sera géré côté frontend
          })
        }
      }

      const usage = await this.calculateUsageStats(userId)

      return {
        id: updatedClient.id,
        userId,
        plan: updatedClient.subscriptionPlan,
        status: 'active',
        startDate: updatedClient.subscriptionStart,
        endDate: updatedClient.subscriptionEnd,
        stripeSubscriptionId: updatedClient.stripeSubscriptionId || undefined,
        stripeCustomerId: client.stripeCustomerId || undefined,
        autoRenew: newPlanId !== 'FREE',
        usage
      }

    } catch (error) {
      console.error('Erreur mise à jour abonnement:', error)
      throw error
    }
  }

  /**
   * Annuler un abonnement
   */
  static async cancelSubscription(userId: string): Promise<{ success: boolean }> {
    try {
      const client = await prisma.client.findUnique({
        where: { userId }
      })

      if (!client || client.subscriptionPlan === 'FREE') {
        throw new Error('Aucun abonnement à annuler')
      }

      // Annuler dans Stripe (à la fin de la période)
      if (client.stripeSubscriptionId) {
        await stripe.subscriptions.update(client.stripeSubscriptionId, {
          cancel_at_period_end: true
        })
      }

      return { success: true }

    } catch (error) {
      console.error('Erreur annulation abonnement:', error)
      throw error
    }
  }

  /**
   * Récupérer l'abonnement actuel d'un utilisateur
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      let client = await prisma.client.findUnique({
        where: { userId },
        include: { user: true }
      })

      // Create a default FREE subscription if client doesn't exist
      if (!client) {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        })

        if (!user || user.role !== 'CLIENT') {
          return null
        }

        // Create default client profile with FREE subscription
        client = await prisma.client.create({
          data: {
            userId,
            subscriptionPlan: 'FREE',
            subscriptionStart: new Date(),
            subscriptionEnd: null
          },
          include: { user: true }
        })
      }

      const usage = await this.calculateUsageStats(userId)
      const now = new Date()
      const isExpired = client.subscriptionEnd && client.subscriptionEnd < now

      return {
        id: client.id,
        userId,
        plan: client.subscriptionPlan,
        status: isExpired ? 'expired' : 'active',
        startDate: client.subscriptionStart,
        endDate: client.subscriptionEnd,
        stripeSubscriptionId: client.stripeSubscriptionId || undefined,
        stripeCustomerId: client.stripeCustomerId || undefined,
        autoRenew: client.subscriptionPlan !== 'FREE',
        usage
      }

    } catch (error) {
      console.error('Erreur récupération abonnement:', error)
      return null
    }
  }

  /**
   * Calculer les statistiques d'usage d'un utilisateur
   */
  static async calculateUsageStats(userId: string): Promise<{
    thisMonth: SubscriptionUsage
    lastMonth: SubscriptionUsage
  }> {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      // Chercher les livraisons basées sur les annonces créées par l'utilisateur
      const [thisMonthDeliveries, lastMonthDeliveries] = await Promise.all([
        prisma.delivery.findMany({
          where: {
            announcement: {
              authorId: userId
            },
            createdAt: { gte: startOfMonth }
          },
          include: {
            announcement: true,
            payment: true
          }
        }),
        prisma.delivery.findMany({
          where: {
            announcement: {
              authorId: userId
            },
            createdAt: {
              gte: startOfLastMonth,
              lt: startOfMonth
            }
          },
          include: {
            announcement: true,
            payment: true
          }
        })
      ])

      const calculateStats = (deliveries: any[]): SubscriptionUsage => {
        return {
          deliveries: deliveries.length,
          savings: deliveries.reduce((total, delivery) => {
            const basePrice = delivery.announcement?.basePrice || delivery.price || 0
            const finalPrice = delivery.announcement?.finalPrice || delivery.price || basePrice
            return total + Math.max(0, basePrice - finalPrice)
          }, 0),
          priorityShipments: deliveries.filter(d => d.announcement?.isUrgent || d.announcement?.priority === 'HIGH').length,
          insuranceUsed: deliveries.reduce((total, delivery) => {
            return total + (delivery.payment?.insuranceClaim || delivery.insuranceFee || 0)
          }, 0)
        }
      }

      return {
        thisMonth: calculateStats(thisMonthDeliveries),
        lastMonth: calculateStats(lastMonthDeliveries)
      }
    } catch (error) {
      console.error('Error calculating usage stats:', error)
      // Return default stats in case of error
      return {
        thisMonth: {
          deliveries: 0,
          savings: 0,
          priorityShipments: 0,
          insuranceUsed: 0
        },
        lastMonth: {
          deliveries: 0,
          savings: 0,
          priorityShipments: 0,
          insuranceUsed: 0
        }
      }
    }
  }

  /**
   * Traiter un webhook d'abonnement Stripe
   */
  static async handleSubscriptionWebhook(
    eventType: string,
    subscription: any
  ): Promise<void> {
    try {
      const userId = subscription.metadata.userId
      if (!userId) {
        console.error('UserID manquant dans les métadonnées de l\'abonnement')
        return
      }

      const client = await prisma.client.findUnique({
        where: { userId }
      })

      if (!client) {
        console.error('Client non trouvé pour userId:', userId)
        return
      }

      switch (eventType) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionCreatedOrUpdated(client, subscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(client)
          break

        default:
          console.log('Événement d\'abonnement non géré:', eventType)
      }

    } catch (error) {
      console.error('Erreur traitement webhook abonnement:', error)
    }
  }

  private static async handleSubscriptionCreatedOrUpdated(
    client: any,
    subscription: any
  ): Promise<void> {
    // Déterminer le plan depuis le price ID
    const priceId = subscription.items.data[0]?.price?.id
    let planId: 'STARTER' | 'PREMIUM' = 'STARTER'

    for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (plan.stripePriceId === priceId) {
        planId = key as 'STARTER' | 'PREMIUM'
        break
      }
    }

    await prisma.client.update({
      where: { id: client.id },
      data: {
        subscriptionPlan: planId,
        subscriptionStart: new Date(subscription.current_period_start * 1000),
        subscriptionEnd: new Date(subscription.current_period_end * 1000),
        stripeSubscriptionId: subscription.id
      }
    })
  }

  private static async handleSubscriptionDeleted(client: any): Promise<void> {
    await prisma.client.update({
      where: { id: client.id },
      data: {
        subscriptionPlan: 'FREE',
        subscriptionEnd: new Date(),
        stripeSubscriptionId: null
      }
    })
  }

  /**
   * Obtenir les plans disponibles
   */
  static getAvailablePlans(): Record<string, SubscriptionPlan> {
    return SUBSCRIPTION_PLANS
  }
}