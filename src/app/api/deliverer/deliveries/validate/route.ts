import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema de validation pour le code 6 chiffres
const validateDeliverySchema = z.object({
  deliveryId: z.string().cuid('ID de livraison invalide'),
  validationCode: z.string().regex(/^\d{6}$/, 'Le code doit être composé de 6 chiffres'),
  location: z.object({
    address: z.string().min(5, 'Adresse requise'),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional()
  }).optional(),
  proofPhotos: z.array(z.string().url()).optional(),
  notes: z.string().max(500).optional()
})

// POST - Validation d'une livraison avec code 6 chiffres
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
    const validatedData = validateDeliverySchema.parse(body)

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (deliverer.validationStatus !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Deliverer account not validated. Cannot validate deliveries.' 
      }, { status: 403 })
    }

    // Récupérer la livraison avec vérifications
    const delivery = await prisma.delivery.findUnique({
      where: { id: validatedData.deliveryId },
      include: {
        announcement: {
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
            }
          }
        },
        payment: true
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Vérifier que c'est bien le livreur assigné
    if (delivery.delivererId !== deliverer.id) {
      return NextResponse.json({ error: 'This delivery is not assigned to you' }, { status: 403 })
    }

    // Vérifier le statut de la livraison
    if (delivery.status !== 'IN_TRANSIT') {
      return NextResponse.json({ 
        error: `Cannot validate delivery with status: ${delivery.status}` 
      }, { status: 400 })
    }

    // Vérifier le code de validation
    if (delivery.validationCode !== validatedData.validationCode) {
      // Log tentative invalide pour sécurité
      await prisma.deliveryLog.create({
        data: {
          deliveryId: delivery.id,
          action: 'VALIDATION_FAILED',
          details: `Invalid code attempt by deliverer ${deliverer.id}`,
          performedBy: session.user.id
        }
      })

      return NextResponse.json({ 
        error: 'Invalid validation code. Please check the 6-digit code provided by the client.' 
      }, { status: 400 })
    }

    // Validation réussie - mettre à jour la livraison
    const updatedDelivery = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de livraison
      const delivery = await tx.delivery.update({
        where: { id: validatedData.deliveryId },
        data: {
          status: 'DELIVERED',
          completedAt: new Date(),
          deliveryLocation: validatedData.location?.address,
          deliveryLat: validatedData.location?.lat,
          deliveryLng: validatedData.location?.lng,
          deliveryNotes: validatedData.notes
        }
      })

      // 2. Créer une preuve de livraison
      if (validatedData.proofPhotos && validatedData.proofPhotos.length > 0) {
        await tx.proofOfDelivery.create({
          data: {
            deliveryId: delivery.id,
            photos: validatedData.proofPhotos,
            location: validatedData.location?.address || '',
            timestamp: new Date(),
            validatedBy: deliverer.id
          }
        })
      }

      // 3. Mettre à jour le statut du paiement
      if (delivery.payment) {
        await tx.payment.update({
          where: { id: delivery.payment.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })
      }

      // 4. Créer un log de l'action
      await tx.deliveryLog.create({
        data: {
          deliveryId: delivery.id,
          action: 'VALIDATED',
          details: `Delivery validated with code ${validatedData.validationCode}`,
          performedBy: session.user.id
        }
      })

      // 5. Mettre à jour les statistics du livreur
      await tx.deliverer.update({
        where: { id: deliverer.id },
        data: {
          totalDeliveries: { increment: 1 },
          totalEarnings: { 
            increment: delivery.payment?.amount || 0 
          }
        }
      })

      return delivery
    })

    // 6. Envoyer notifications (client et livreur)
    // TODO: Implémenter les notifications OneSignal
    // await notificationService.sendDeliveryCompleted(delivery.announcement.client.user.id, delivery.id)

    return NextResponse.json({
      message: 'Delivery validated successfully',
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        completedAt: updatedDelivery.completedAt,
        validationCode: null // Ne pas retourner le code pour sécurité
      },
      earnings: delivery.payment?.amount || 0
    }, { status: 200 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return handleApiError(error, 'validating delivery')
  }
}