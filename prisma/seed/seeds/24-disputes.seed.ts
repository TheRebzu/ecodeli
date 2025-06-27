import { PrismaClient } from '@prisma/client'
import { SeedContext } from '../config/seed.config'
import { ROLES } from '../data/constants'

export async function seedDisputes(prisma: PrismaClient, context: SeedContext) {
  console.log('⚖️ Seeding disputes data...')

  // Récupérer les livraisons et réservations existantes
  const deliveries = await prisma.delivery.findMany({
    include: { 
      announcement: { include: { author: true } },
      deliverer: true 
    }
  })

  const bookings = await prisma.booking.findMany({
    include: {
      service: { include: { provider: true } },
      client: true
    }
  })

  const admins = await prisma.user.findMany({
    where: { role: ROLES.ADMIN }
  })

  if (admins.length === 0) {
    context.logger?.log('No admins found for dispute resolution')
    return
  }

  // Types de litiges
  const disputeTypes = [
    'DELIVERY_DELAY',
    'DAMAGE_CLAIM',
    'SERVICE_QUALITY',
    'PAYMENT_ISSUE',
    'COMMUNICATION_PROBLEM',
    'CANCELLATION_DISPUTE',
    'REFUND_REQUEST',
    'CONTRACT_BREACH'
  ]

  const disputeReasons = {
    DELIVERY_DELAY: [
      'Livraison effectuée avec 2h de retard',
      'Colis non livré à la date prévue',
      'Retard non justifié du livreur'
    ],
    DAMAGE_CLAIM: [
      'Colis endommagé pendant le transport',
      'Emballage détérioré à la réception',
      'Objet cassé lors de la livraison'
    ],
    SERVICE_QUALITY: [
      'Prestation non conforme aux attentes',
      'Travail mal réalisé',
      'Service incomplet'
    ],
    PAYMENT_ISSUE: [
      'Paiement non reçu après livraison',
      'Montant incorrect facturé',
      'Problème de remboursement'
    ],
    COMMUNICATION_PROBLEM: [
      'Livreur injoignable',
      'Instructions non respectées',
      'Manque de communication'
    ],
    CANCELLATION_DISPUTE: [
      'Annulation tardive non justifiée',
      'Frais d\'annulation contestés',
      'Annulation unilatérale'
    ]
  }

  // Créer des litiges pour les livraisons
  for (let i = 0; i < Math.min(8, deliveries.length); i++) {
    const delivery = deliveries[i]
    if (!delivery.announcement?.author || !delivery.deliverer) continue

    const disputeType = disputeTypes[i % disputeTypes.length]
    const reasons = disputeReasons[disputeType] || ['Problème général']
    const reason = reasons[Math.floor(Math.random() * reasons.length)]

    const isClientComplaintant = Math.random() > 0.5
    const complainantId = isClientComplaintant ? delivery.announcement.author.id : delivery.deliverer.id
    const defendantId = isClientComplaintant ? delivery.deliverer.id : delivery.announcement.author.id

    const openedAt = new Date(delivery.createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
    const status = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'][Math.floor(Math.random() * 4)]
    
    const dispute = await prisma.dispute.create({
      data: {
        complainantId,
        defendantId,
        relatedDeliveryId: delivery.id,
        relatedBookingId: null,
        type: disputeType,
        status,
        priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
        title: `Litige ${disputeType.toLowerCase().replace('_', ' ')} - Livraison #${delivery.trackingNumber}`,
        description: reason,
        amount: Math.random() > 0.5 ? Math.floor(Math.random() * 100) + 10 : null,
        openedAt,
        assignedAdminId: status !== 'OPEN' ? admins[Math.floor(Math.random() * admins.length)].id : null,
        resolutionDate: status === 'RESOLVED' || status === 'CLOSED' ? 
          new Date(openedAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
        resolutionNote: status === 'RESOLVED' || status === 'CLOSED' ? 
          'Litige résolu par médiation' : null,
        compensationAmount: status === 'RESOLVED' && Math.random() > 0.5 ? 
          Math.floor(Math.random() * 50) + 10 : null
      }
    })

    // Créer les messages du litige
    const messages = [
      {
        disputeId: dispute.id,
        senderId: complainantId,
        content: `Bonjour, je souhaite signaler un problème : ${reason}`,
        isFromAdmin: false,
        attachments: [],
        createdAt: openedAt
      }
    ]

    if (status !== 'OPEN') {
      messages.push({
        disputeId: dispute.id,
        senderId: defendantId,
        content: 'Je conteste cette réclamation. Voici ma version des faits...',
        isFromAdmin: false,
        attachments: [],
        createdAt: new Date(openedAt.getTime() + 2 * 60 * 60 * 1000)
      })

      if (dispute.assignedAdminId) {
        messages.push({
          disputeId: dispute.id,
          senderId: dispute.assignedAdminId,
          content: 'Nous avons pris en charge votre litige. Nous examinons les éléments.',
          isFromAdmin: true,
          attachments: [],
          createdAt: new Date(openedAt.getTime() + 24 * 60 * 60 * 1000)
        })
      }
    }

    for (const messageData of messages) {
      await prisma.disputeMessage.create({
        data: messageData
      })
    }

    // Créer l'historique des actions
    const actions = [
      {
        disputeId: dispute.id,
        adminId: dispute.assignedAdminId,
        action: 'DISPUTE_OPENED',
        description: 'Litige ouvert par le client',
        performedAt: openedAt
      }
    ]

    if (status !== 'OPEN' && dispute.assignedAdminId) {
      actions.push({
        disputeId: dispute.id,
        adminId: dispute.assignedAdminId,
        action: 'ADMIN_ASSIGNED',
        description: 'Administrateur assigné au litige',
        performedAt: new Date(openedAt.getTime() + 30 * 60 * 1000)
      })

      if (status === 'RESOLVED' || status === 'CLOSED') {
        actions.push({
          disputeId: dispute.id,
          adminId: dispute.assignedAdminId,
          action: 'DISPUTE_RESOLVED',
          description: 'Litige résolu avec compensation',
          performedAt: dispute.resolutionDate!
        })
      }
    }

    for (const actionData of actions) {
      if (actionData.adminId) {
        await prisma.disputeAction.create({
          data: actionData
        })
      }
    }
  }

  // Créer quelques litiges pour les réservations de services
  for (let i = 0; i < Math.min(5, bookings.length); i++) {
    const booking = bookings[i]
    if (!booking.client || !booking.service?.provider) continue

    const disputeType = ['SERVICE_QUALITY', 'PAYMENT_ISSUE', 'CANCELLATION_DISPUTE'][i % 3]
    const reasons = disputeReasons[disputeType] || ['Problème général']
    const reason = reasons[Math.floor(Math.random() * reasons.length)]

    const openedAt = new Date(booking.createdAt.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000)
    const status = ['OPEN', 'IN_REVIEW', 'RESOLVED'][Math.floor(Math.random() * 3)]

    await prisma.dispute.create({
      data: {
        complainantId: booking.client.id,
        defendantId: booking.service.provider.id,
        relatedDeliveryId: null,
        relatedBookingId: booking.id,
        type: disputeType,
        status,
        priority: 'MEDIUM',
        title: `Litige service - ${booking.service.name}`,
        description: reason,
        amount: Math.floor(Math.random() * 200) + 50,
        openedAt,
        assignedAdminId: status !== 'OPEN' ? admins[Math.floor(Math.random() * admins.length)].id : null,
        resolutionDate: status === 'RESOLVED' ? 
          new Date(openedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        resolutionNote: status === 'RESOLVED' ? 
          'Résolution amiable trouvée' : null
      }
    })
  }

  // Créer des statistiques de résolution
  await prisma.disputeStatistics.upsert({
    where: { month_year: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } },
    update: {},
    create: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalDisputes: await prisma.dispute.count(),
      resolvedDisputes: await prisma.dispute.count({ where: { status: 'RESOLVED' } }),
      averageResolutionTime: 3.5, // jours
      customerSatisfactionRate: 0.85,
      compensationsPaid: Math.floor(Math.random() * 2000) + 500,
      topDisputeType: 'DELIVERY_DELAY'
    }
  })

  context.logger?.log(`✅ Disputes seeding completed - ${await prisma.dispute.count()} disputes created`)
} 