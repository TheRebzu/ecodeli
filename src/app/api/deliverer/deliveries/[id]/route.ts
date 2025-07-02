import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Schema pour valider une livraison avec le code
const validateDeliverySchema = z.object({
  validationCode: z.string().length(6, 'Validation code must be 6 digits'),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
  photos: z.array(z.string().url()).optional()
})

// Schema pour ajouter une preuve de livraison
const proofOfDeliverySchema = z.object({
  recipientName: z.string().optional(),
  recipientSignature: z.string().optional(), // Base64
  photos: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
  location: z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number()
  }).optional()
})

// GET - Détails d'une livraison spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: deliveryId } = await params

    // Récupérer la livraison avec toutes les relations
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: session.user.id
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        },
        client: {
          include: {
            profile: true
          }
        },
        deliverer: {
          include: {
            profile: true
          }
        },
        payment: true,
        validations: true,
        history: true,
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 10
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    return NextResponse.json({
      delivery,
      canValidate: ['IN_TRANSIT', 'PICKED_UP', 'ACCEPTED'].includes(delivery.status),
      validationCodeRequired: delivery.validationCode && delivery.status !== 'DELIVERED'
    })

  } catch (error) {
    console.error('Error fetching delivery details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Valider une livraison avec le code à 6 chiffres
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: deliveryId } = await params
    const body = await request.json()
    const validatedData = validateDeliverySchema.parse(body)

    // Récupérer la livraison
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: session.user.id
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        },
        client: {
          include: {
            profile: true
          }
        },
        deliverer: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Vérifier que la livraison peut être validée
    if (!['PICKED_UP', 'IN_TRANSIT', 'ACCEPTED'].includes(delivery.status)) {
      return NextResponse.json(
        { error: `Delivery cannot be validated in current status: ${delivery.status}` },
        { status: 400 }
      )
    }

    // Vérifier le code de validation
    if (delivery.validationCode !== validatedData.validationCode) {
      return NextResponse.json(
        { error: 'Invalid validation code' },
        { status: 400 }
      )
    }

    // Valider la livraison
    const validatedDelivery = await prisma.$transaction(async (tx) => {
      // Mettre à jour le statut de la livraison
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          actualDeliveryDate: new Date()
        }
      })

      // Créer la preuve de livraison
      await tx.proofOfDelivery.create({
        data: {
          deliveryId,
          recipientName: validatedData.recipientName,
          photos: validatedData.photos || [],
          notes: validatedData.notes,
          validatedWithCode: true,
          validatedWithNFC: false
        }
      })

      // Mettre à jour l'annonce
      await tx.announcement.update({
        where: { id: delivery.announcementId },
        data: { status: 'COMPLETED' }
      })

      // Mettre à jour les statistiques du livreur
      await tx.deliverer.update({
        where: { userId: delivery.delivererId },
        data: {
          totalDeliveries: {
            increment: 1
          }
        }
      })

      return updated
    })

    return NextResponse.json({
      delivery: validatedDelivery,
      message: 'Delivery validated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error validating delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 