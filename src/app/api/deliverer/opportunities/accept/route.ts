import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour accepter une opportunité
const acceptOpportunitySchema = z.object({
  announcementId: z.string().cuid('ID d\'annonce invalide'),
  proposedPrice: z.number().positive('Le prix proposé doit être positif').optional(),
  estimatedPickupTime: z.string().datetime().optional(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  message: z.string().max(500).optional(),
  conditions: z.string().max(300).optional()
})

// Fonction pour générer un code de validation à 6 chiffres
function generateValidationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST - Accepter une opportunité de livraison
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = acceptOpportunitySchema.parse(body)

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (deliverer.validationStatus !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Deliverer account not validated. Cannot accept deliveries.' 
      }, { status: 403 })
    }

    // Vérifier que l'annonce existe et est disponible
    const announcement = await prisma.announcement.findUnique({
      where: { id: validatedData.announcementId },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        deliveries: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    if (announcement.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: `Announcement is not available (status: ${announcement.status})` 
      }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas déjà une livraison acceptée
    const existingDelivery = announcement.deliveries.find(d => d.status === 'ACCEPTED')
    if (existingDelivery) {
      return NextResponse.json({ 
        error: 'This announcement has already been accepted by another deliverer' 
      }, { status: 409 })
    }

    // Vérifier que le livreur n'a pas déjà une livraison pour cette annonce
    const delivererExistingDelivery = announcement.deliveries.find(d => d.delivererId === deliverer.id)
    if (delivererExistingDelivery) {
      return NextResponse.json({ 
        error: 'You have already submitted a delivery request for this announcement' 
      }, { status: 409 })
    }

    // Générer le code de validation
    const validationCode = generateValidationCode()
    const finalPrice = validatedData.proposedPrice || announcement.price

    // Créer la livraison
    const delivery = await prisma.$transaction(async (tx) => {
      // 1. Créer la livraison
      const newDelivery = await tx.delivery.create({
        data: {
          announcementId: announcement.id,
          delivererId: deliverer.id,
          status: 'ACCEPTED',
          validationCode,
          pickupAddress: announcement.pickupAddress,
          deliveryAddress: announcement.deliveryAddress,
          scheduledAt: announcement.scheduledAt,
          proposedPrice: finalPrice,
          estimatedPickupTime: validatedData.estimatedPickupTime ? new Date(validatedData.estimatedPickupTime) : null,
          estimatedDeliveryTime: validatedData.estimatedDeliveryTime ? new Date(validatedData.estimatedDeliveryTime) : null,
          delivererMessage: validatedData.message,
          conditions: validatedData.conditions
        },
        include: {
          announcement: {
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      profile: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      // 2. Mettre à jour le statut de l'annonce
      await tx.announcement.update({
        where: { id: announcement.id },
        data: { status: 'IN_PROGRESS' }
      })

      // 3. Créer un paiement en attente
      await tx.payment.create({
        data: {
          userId: announcement.clientId,
          deliveryId: newDelivery.id,
          amount: finalPrice,
          currency: 'EUR',
          status: 'PENDING',
          type: 'DELIVERY',
          description: `Payment for delivery: ${announcement.title}`
        }
      })

      // 4. Log de l'action
      await tx.deliveryLog.create({
        data: {
          deliveryId: newDelivery.id,
          action: 'ACCEPTED',
          details: `Delivery accepted by deliverer ${deliverer.id} with validation code ${validationCode}`,
          performedBy: session.user.id
        }
      })

      return newDelivery
    })

    // 5. Envoyer notifications
    // TODO: Implémenter les notifications OneSignal
    // await notificationService.sendDeliveryAccepted(announcement.client.userId, delivery.id)
    // await notificationService.sendValidationCode(announcement.client.userId, validationCode)

    return NextResponse.json({
      message: 'Delivery accepted successfully',
      delivery: {
        id: delivery.id,
        status: delivery.status,
        validationCode: validationCode, // Code visible uniquement au livreur
        scheduledAt: delivery.scheduledAt,
        proposedPrice: finalPrice,
        estimatedPickupTime: delivery.estimatedPickupTime,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime
      },
      client: {
        name: `${delivery.announcement.client.user.profile?.firstName} ${delivery.announcement.client.user.profile?.lastName}`,
        phone: delivery.announcement.client.user.profile?.phone,
        email: delivery.announcement.client.user.email
      },
      nextSteps: [
        'Contact the client to confirm pickup details',
        'Arrive at pickup location on time',
        'Complete the delivery and ask client for the 6-digit validation code',
        'Enter the validation code to confirm delivery completion'
      ]
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return handleApiError(error, 'accepting delivery opportunity')
  }
}