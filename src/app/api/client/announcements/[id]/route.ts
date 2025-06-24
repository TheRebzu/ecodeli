import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const announcement = await prisma.announcement.findFirst({
      where: {
        id: params.id,
        authorId: session.user.id
      },
      include: {
        _count: {
          select: { 
            applications: true,
            deliveries: true
          }
        },
        applications: {
          include: {
            deliverer: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    rating: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        deliveries: {
          include: {
            deliverer: {
              select: {
                id: true,
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
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        }
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Vérifier que l'annonce existe et appartient au client
    const existingAnnouncement = await prisma.announcement.findFirst({
      where: {
        id: params.id,
        authorId: session.user.id
      },
      include: {
        deliveries: {
          where: {
            status: { in: ['ACCEPTED', 'IN_TRANSIT'] }
          }
        }
      }
    })

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: 'Annonce non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier qu'on peut modifier (pas de livraison en cours)
    if (existingAnnouncement.deliveries.length > 0) {
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
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Vérifier que l'annonce existe et appartient au client
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: params.id,
        authorId: session.user.id
      },
      include: {
        deliveries: {
          where: {
            status: { in: ['ACCEPTED', 'IN_TRANSIT'] }
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json(
        { error: 'Annonce non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier qu'on peut supprimer (pas de livraison en cours)
    if (announcement.deliveries.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une annonce avec livraison en cours' },
        { status: 400 }
      )
    }

    // Supprimer l'annonce et toutes ses relations
    await prisma.$transaction([
      // Supprimer les candidatures
      prisma.deliveryApplication.deleteMany({
        where: { announcementId: params.id }
      }),
      // Supprimer les livraisons terminées/annulées
      prisma.delivery.deleteMany({
        where: {
          announcementId: params.id,
          status: { in: ['COMPLETED', 'CANCELLED'] }
        }
      }),
      // Supprimer l'annonce
      prisma.announcement.delete({
        where: { id: params.id }
      })
    ])

    return NextResponse.json({ message: 'Annonce supprimée avec succès' })

  } catch (error) {
    console.error('Erreur suppression annonce:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
