import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema de validation pour acceptation d'opportunité
const acceptOpportunitySchema = z.object({
  routeId: z.string().optional(),
  estimatedPickupTime: z.string().datetime().optional(),
  estimatedDeliveryTime: z.string().datetime().optional(),
  notes: z.string().optional()
})

// POST - Accepter une opportunité de livraison
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const { id: announcementId } = params
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
        error: 'Deliverer account not validated. Please complete document validation.' 
      }, { status: 403 })
    }

    // Vérifier que l'annonce existe et est disponible
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
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
        error: 'Announcement is not available for delivery' 
      }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas déjà une livraison acceptée
    if (announcement.deliveries.length > 0) {
      return NextResponse.json({ 
        error: 'This announcement already has an assigned deliverer' 
      }, { status: 409 })
    }

    // Vérifier que le livreur n'a pas déjà une livraison en cours pour cette annonce
    const existingDelivery = await prisma.delivery.findFirst({
      where: {
        announcementId,
        delivererId: deliverer.id,
        status: {
          in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
        }
      }
    })

    if (existingDelivery) {
      return NextResponse.json({ 
        error: 'You already have an active delivery for this announcement' 
      }, { status: 409 })
    }

    // Générer un code de validation à 6 chiffres
    const validationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Transaction pour créer la livraison et mettre à jour l'annonce
    const result = await prisma.$transaction(async (tx) => {
      // Créer la livraison
      const delivery = await tx.delivery.create({
        data: {
          announcementId,
          delivererId: deliverer.id,
          status: 'ACCEPTED',
          validationCode,
          pickupLocation: announcement.pickupLocation,
          deliveryLocation: announcement.deliveryLocation,
          scheduledPickupTime: validatedData.estimatedPickupTime ? 
            new Date(validatedData.estimatedPickupTime) : 
            announcement.scheduledAt,
          scheduledDeliveryTime: validatedData.estimatedDeliveryTime ? 
            new Date(validatedData.estimatedDeliveryTime) : 
            announcement.scheduledAt,
          notes: validatedData.notes
        },
        include: {
          announcement: {
            include: {
              author: {
                select: {
                  id: true,
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
          }
        }
      })

      // Mettre à jour le statut de l'annonce
      await tx.announcement.update({
        where: { id: announcementId },
        data: { status: 'IN_PROGRESS' }
      })

      // Créer une entrée de suivi
      await tx.deliveryTracking.create({
        data: {
          deliveryId: delivery.id,
          status: 'ACCEPTED',
          message: 'Livraison acceptée par le livreur',
          location: delivery.pickupLocation as any
        }
      })

      // Associer la route si spécifiée
      if (validatedData.routeId) {
        const route = await tx.route.findFirst({
          where: {
            id: validatedData.routeId,
            delivererId: deliverer.id
          }
        })

        if (route) {
          await tx.routeAnnouncementMatch.create({
            data: {
              routeId: validatedData.routeId,
              announcementId,
              matchScore: 100, // Score maximal pour une acceptation manuelle
              status: 'ACCEPTED'
            }
          })
        }
      }

      return delivery
    })

    // TODO: Envoyer notification push au client
    // await notificationService.sendToUser(
    //   announcement.authorId,
    //   'Livreur trouvé !',
    //   `${deliverer.user.profile?.firstName} a accepté votre livraison`
    // )

    // TODO: Envoyer SMS/email avec code de validation au client
    // await smsService.sendValidationCode(
    //   announcement.author.profile?.phone,
    //   validationCode
    // )

    return NextResponse.json({
      success: true,
      delivery: result,
      validationCode, // En production, ne pas retourner dans la réponse
      message: 'Opportunité acceptée avec succès'
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