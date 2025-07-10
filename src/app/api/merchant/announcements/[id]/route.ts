import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Schéma pour mise à jour d'annonce
const updateAnnouncementSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(2000).optional(),
  basePrice: z.number().min(0).optional(),
  pickupAddress: z.string().min(10).max(500).optional(),
  deliveryAddress: z.string().min(10).max(500).optional(),
  weight: z.number().min(0.1).optional(),
  dimensions: z.string().optional(),
  isFragile: z.boolean().optional(),
  requiresInsurance: z.boolean().optional(),
  maxInsuranceValue: z.number().min(0).optional(),
  availableFrom: z.string().datetime().optional(),
  availableUntil: z.string().datetime().optional(),
  isUrgent: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  specialInstructions: z.string().optional()
})

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const announcement = await db.announcement.findFirst({
      where: {
        id,
        authorId: user.id
      },
      include: {
        delivery: {
          include: {
            deliverer: {
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
            },
            payment: {
              select: {
                status: true,
                amount: true
              }
            }
          }
        },
        payment: {
          select: {
            status: true,
            amount: true
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Annonce non trouvée' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      announcement: {
        id: announcement.id,
        title: announcement.title,
        description: announcement.description,
        type: announcement.type,
        status: announcement.status,
        basePrice: announcement.basePrice,
        finalPrice: announcement.finalPrice,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        weight: announcement.weight,
        dimensions: announcement.dimensions,
        isFragile: announcement.isFragile,
        requiresInsurance: announcement.requiresInsurance,
        maxInsuranceValue: announcement.maxInsuranceValue,
        availableFrom: announcement.availableFrom,
        availableUntil: announcement.availableUntil,
        isUrgent: announcement.isUrgent,
        tags: announcement.tags,
        specialInstructions: announcement.specialInstructions,
        createdAt: announcement.createdAt,
        updatedAt: announcement.updatedAt,
        delivery: announcement.delivery ? {
          id: announcement.delivery.id,
          status: announcement.delivery.status,
          deliverer: announcement.delivery.deliverer ? {
            name: `${announcement.delivery.deliverer.profile?.firstName || ''} ${announcement.delivery.deliverer.profile?.lastName || ''}`.trim(),
            phone: announcement.delivery.deliverer.profile?.phone
          } : null,
          payment: announcement.delivery.payment,
          pickupDate: announcement.delivery.pickupDate,
          deliveryDate: announcement.delivery.deliveryDate,
          actualDeliveryDate: announcement.delivery.actualDeliveryDate
        } : null,
        payment: announcement.payment
      }
    })

  } catch (error) {
    console.error('❌ Erreur récupération annonce:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Vérifier que l'annonce appartient au commerçant
    const existingAnnouncement = await db.announcement.findFirst({
      where: {
        id,
        authorId: user.id
      },
      include: {
        delivery: true
      }
    })

    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Annonce non trouvée' }, { status: 404 })
    }

    // Vérifier si l'annonce peut être modifiée
    if (existingAnnouncement.delivery && existingAnnouncement.delivery.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Impossible de modifier une annonce déjà en cours de livraison' 
      }, { status: 400 })
    }

    const body = await request.json()
    const updateData = updateAnnouncementSchema.parse(body)

    // Mettre à jour l'annonce
    const updatedAnnouncement = await db.announcement.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Annonce mise à jour avec succès',
      announcement: {
        id: updatedAnnouncement.id,
        title: updatedAnnouncement.title,
        basePrice: updatedAnnouncement.basePrice,
        status: updatedAnnouncement.status,
        updatedAt: updatedAnnouncement.updatedAt
      }
    })

  } catch (error) {
    console.error('❌ Erreur mise à jour annonce:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Vérifier que l'annonce appartient au commerçant
    const existingAnnouncement = await db.announcement.findFirst({
      where: {
        id,
        authorId: user.id
      },
      include: {
        delivery: true
      }
    })

    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Annonce non trouvée' }, { status: 404 })
    }

    // Vérifier si l'annonce peut être supprimée
    if (existingAnnouncement.delivery && existingAnnouncement.delivery.status === 'IN_TRANSIT') {
      return NextResponse.json({ 
        error: 'Impossible de supprimer une annonce en cours de livraison' 
      }, { status: 400 })
    }

    // Si la livraison est en cours, l'annuler plutôt que la supprimer
    if (existingAnnouncement.delivery) {
      await db.announcement.update({
        where: { id },
        data: { status: 'CANCELLED' }
      })

      return NextResponse.json({
        success: true,
        message: 'Annonce annulée avec succès'
      })
    }

    // Supprimer l'annonce si pas de livraison
    await db.announcement.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Annonce supprimée avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur suppression annonce:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
