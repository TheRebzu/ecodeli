import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema de validation pour modification d'annonce
const updateAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères').optional(),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères').optional(),
  pickupAddress: z.string().min(10, 'Adresse de récupération requise').optional(),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise').optional(),
  weight: z.number().positive('Le poids doit être positif').optional(),
  dimensions: z.string().optional(),
  pickupDate: z.string().datetime('Date de récupération invalide').optional(),
  deliveryDeadline: z.string().datetime('Date limite de livraison invalide').optional(),
  price: z.number().positive('Le prix doit être positif').optional(),
  isFragile: z.boolean().optional(),
  requiresSpecialHandling: z.boolean().optional(),
  instructions: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional()
})

// GET - Détails d'une annonce spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé - Rôle CLIENT requis' }, { status: 403 })
    }

    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        authorId: user.id
      },
      include: {
        _count: {
          select: { 
            reviews: true,
            matches: true,
            attachments: true,
            notifications: true,
            tracking: true
          }
        },
        delivery: {
          select: {
            id: true,
            status: true,
            trackingNumber: true,
            validationCode: true,
            pickupDate: true,
            deliveryDate: true,
            actualDeliveryDate: true,
            price: true,
            delivererFee: true,
            platformFee: true,
            insuranceFee: true,
            createdAt: true,
            updatedAt: true,
            deliverer: {
              select: {
                id: true,
                name: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    phone: true
                  }
                }
              }
            },
            tracking: {
              orderBy: { timestamp: 'desc' },
              take: 10
            },
            ProofOfDelivery: {
              select: {
                photos: true,
                notes: true,
                createdAt: true
              }
            }
          }
        },
        reviews: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        avatar: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: true
      }
    })

    if (!announcement) {
      return NextResponse.json(
        { error: 'Annonce non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(announcement)

  } catch (error) {
    console.error('Erreur récupération annonce:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

// PUT - Modifier une annonce
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé - Rôle CLIENT requis' }, { status: 403 })
    }

    // Vérifier que l'annonce existe et appartient au client
    const existingAnnouncement = await prisma.announcement.findFirst({
      where: {
        id,
        authorId: user.id
      },
      include: {
        delivery: true
      }
    })

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: 'Annonce non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier qu'on peut modifier (pas de livraison en cours)
    if (existingAnnouncement.delivery && ['ACCEPTED', 'IN_TRANSIT'].includes(existingAnnouncement.delivery.status)) {
      return NextResponse.json(
        { error: 'Impossible de modifier une annonce avec livraison en cours' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateAnnouncementSchema.parse(body)

    // Valider les dates si elles sont modifiées
    if (validatedData.pickupDate || validatedData.deliveryDeadline) {
      const pickupDate = new Date(validatedData.pickupDate || existingAnnouncement.pickupDate)
      const deliveryDeadline = new Date(validatedData.deliveryDeadline || existingAnnouncement.deliveryDeadline)
      const now = new Date()

      if (pickupDate <= now) {
        return NextResponse.json(
          { error: 'La date de récupération doit être future' },
          { status: 400 }
        )
      }

      if (deliveryDeadline <= pickupDate) {
        return NextResponse.json(
          { error: 'La date limite doit être après la récupération' },
          { status: 400 }
        )
      }
    }

    // Mettre à jour l'annonce
    const updatedAnnouncement = await prisma.announcement.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { applications: true }
        }
      }
    })

    return NextResponse.json(updatedAnnouncement)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur modification annonce:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une annonce
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé - Rôle CLIENT requis' }, { status: 403 })
    }

    // Vérifier que l'annonce existe et appartient au client
    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        authorId: user.id
      },
      include: {
        delivery: true
      }
    })

    if (!announcement) {
      return NextResponse.json(
        { error: 'Annonce non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier qu'on peut supprimer (pas de livraison en cours)
    if (announcement.delivery && ['ACCEPTED', 'IN_TRANSIT'].includes(announcement.delivery.status)) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une annonce avec livraison en cours' },
        { status: 400 }
      )
    }

    // Supprimer l'annonce et toutes ses relations
    await prisma.announcement.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Annonce supprimée avec succès' })

  } catch (error) {
    console.error('Erreur suppression annonce:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
