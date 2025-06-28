import { SeedContext } from '../config/seed.config'

export async function seedAnalytics(context: SeedContext) {
  const { prisma } = context
  console.log('📊 Seeding analytics data...')

  // Récupérer les données existantes
  const users = await prisma.user.findMany()
  const deliveries = await prisma.delivery.findMany()
  const bookings = await prisma.booking.findMany()
  const payments = await prisma.payment.findMany()

  let count = 0

  // Analytics pour les livraisons
  for (const delivery of deliveries.slice(0, 30)) {
    // Création de la livraison
    await prisma.analytics.create({
      data: {
        type: 'DELIVERY',
        entity: 'CLIENT',
        entityId: delivery.clientId || '',
        action: 'CREATED',
        metadata: {
          deliveryId: delivery.id,
          type: delivery.type,
          pickupAddress: delivery.pickupAddress,
          deliveryAddress: delivery.deliveryAddress,
          distance: Math.floor(Math.random() * 50) + 5
        },
        value: parseFloat(delivery.price.toString()),
        date: delivery.createdAt,
        period: 'DAILY'
      }
    })

    // Completion si livrée
    if (delivery.status === 'DELIVERED') {
      await prisma.analytics.create({
        data: {
          type: 'DELIVERY',
          entity: 'DELIVERER',
          entityId: delivery.delivererId || '',
          action: 'COMPLETED',
          metadata: {
            deliveryId: delivery.id,
            deliveryTime: Math.floor(Math.random() * 120) + 30,
            rating: Math.floor(Math.random() * 2) + 4
          },
          value: parseFloat(delivery.price.toString()),
          date: delivery.updatedAt,
          period: 'DAILY'
        }
      })
    }

    count++
  }

  // Analytics pour les réservations
  for (const booking of bookings.slice(0, 20)) {
    await prisma.analytics.create({
      data: {
        type: 'BOOKING',
        entity: 'CLIENT',
        entityId: booking.clientId,
        action: 'CREATED',
        metadata: {
          bookingId: booking.id,
          serviceType: booking.serviceType,
          duration: booking.duration,
          providerId: booking.providerId
        },
        value: parseFloat(booking.totalPrice.toString()),
        date: booking.createdAt,
        period: 'DAILY'
      }
    })

    if (booking.status === 'COMPLETED') {
      await prisma.analytics.create({
        data: {
          type: 'BOOKING',
          entity: 'PROVIDER',
          entityId: booking.providerId,
          action: 'COMPLETED',
          metadata: {
            bookingId: booking.id,
            clientSatisfaction: Math.floor(Math.random() * 2) + 4,
            duration: booking.duration
          },
          value: parseFloat(booking.totalPrice.toString()),
          date: booking.updatedAt,
          period: 'DAILY'
        }
      })
    }

    count++
  }

  // Analytics pour les paiements
  for (const payment of payments.slice(0, 25)) {
    await prisma.analytics.create({
      data: {
        type: 'PAYMENT',
        entity: 'CLIENT',
        entityId: payment.userId,
        action: payment.status === 'COMPLETED' ? 'COMPLETED' : 'CREATED',
        metadata: {
          paymentId: payment.id,
          paymentMethod: payment.paymentMethod,
          currency: payment.currency
        },
        value: parseFloat(payment.amount.toString()),
        date: payment.createdAt,
        period: 'DAILY'
      }
    })

    count++
  }

  // Analytics pour les inscriptions
  for (const user of users.slice(0, 25)) {
    await prisma.analytics.create({
      data: {
        type: 'USER',
        entity: user.role,
        entityId: user.id,
        action: 'CREATED',
        metadata: {
          userId: user.id,
          role: user.role,
          verificationStatus: user.isVerified ? 'VERIFIED' : 'PENDING'
        },
        date: user.createdAt,
        period: 'DAILY'
      }
    })

    count++
  }

  // Analytics agrégées quotidiennes
  const now = new Date()
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)

    await prisma.analytics.create({
      data: {
        type: 'SERVICE',
        entity: 'PLATFORM',
        entityId: 'system',
        action: 'DAILY_SUMMARY',
        metadata: {
          totalDeliveries: Math.floor(Math.random() * 50) + 10,
          totalBookings: Math.floor(Math.random() * 30) + 5,
          totalRevenue: Math.floor(Math.random() * 5000) + 1000,
          activeUsers: Math.floor(Math.random() * 200) + 50
        },
        value: Math.floor(Math.random() * 5000) + 1000,
        date,
        period: 'DAILY'
      }
    })

    count++
  }

  // Créer des liens de parrainage avec analytics
  const referralPrograms = await prisma.referralProgram.findMany()
  
  for (const program of referralPrograms.slice(0, 3)) {
    // Créer des liens
    for (let i = 0; i < 3; i++) {
      const link = await prisma.influencerLink.create({
        data: {
          programId: program.id,
          url: `https://ecodeli.com/ref/${program.id}/link${i}`,
          shortCode: `REF${program.id.slice(-4)}${i}`,
          description: `Lien de parrainage ${i + 1}`,
          clicks: Math.floor(Math.random() * 100),
          conversions: Math.floor(Math.random() * 10),
          revenue: Math.floor(Math.random() * 500),
          utmSource: 'referral',
          utmMedium: 'link',
          utmCampaign: program.code
        }
      })

      // Analytics pour ce lien (7 derniers jours)
      for (let day = 0; day < 7; day++) {
        const analyticsDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000)
        
        await prisma.linkAnalytics.create({
          data: {
            linkId: link.id,
            date: analyticsDate,
            clicks: Math.floor(Math.random() * 15),
            uniqueClicks: Math.floor(Math.random() * 10),
            conversions: Math.floor(Math.random() * 3),
            revenue: Math.floor(Math.random() * 50),
            countries: {
              'FR': 70,
              'BE': 20,
              'CH': 10
            },
            devices: {
              'mobile': 60,
              'desktop': 35,
              'tablet': 5
            },
            referrers: {
              'instagram.com': 40,
              'facebook.com': 30,
              'direct': 30
            }
          }
        })

        count++
      }
    }
  }

  context.logger?.log(`✅ Analytics seeding completed - Created ${count} analytics records`)
} 