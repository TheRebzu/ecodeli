import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema pour évaluer une livraison
const rateDeliverySchema = z.object({
  rating: z.number().min(1, 'Note minimum 1').max(5, 'Note maximum 5'),
  review: z.string().max(500, 'Commentaire trop long').optional(),
  tips: z.number().min(0, 'Pourboire ne peut être négatif').optional()
})

// GET - Liste des livraisons du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    // Construire les filtres
    const where: any = {
      announcement: {
        authorId: session.user.id
      }
    }

    if (status && ['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status
    }

    // Récupérer les livraisons
    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              pickupAddress: true,
              deliveryAddress: true,
              serviceType: true,
              price: true
            }
          },
          deliverer: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  phone: true,
                  rating: true
                }
              }
            }
          },
          tracking: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: {
              tracking: true
            }
          }
        }
      }),
      prisma.delivery.count({ where })
    ])

    return NextResponse.json({
      deliveries: deliveries.map(delivery => ({
        id: delivery.id,
        status: delivery.status,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        actualDeliveryTime: delivery.actualDeliveryTime,
        price: delivery.price,
        rating: delivery.rating,
        review: delivery.review,
        tips: delivery.tips,
        createdAt: delivery.createdAt,
        announcement: delivery.announcement,
        deliverer: {
          id: delivery.deliverer.id,
          name: `${delivery.deliverer.profile?.firstName} ${delivery.deliverer.profile?.lastName}`,
          avatar: delivery.deliverer.profile?.avatar,
          phone: delivery.deliverer.profile?.phone,
          rating: delivery.deliverer.profile?.rating || 0
        },
        lastTracking: delivery.tracking[0] || null,
        trackingCount: delivery._count.tracking
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching client deliveries:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Valider une livraison ou donner une évaluation
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'validate' ou 'rate'
    const deliveryId = searchParams.get('deliveryId')

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'ID de livraison requis' },
        { status: 400 }
      )
    }

    // Vérifier que la livraison appartient au client
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        announcement: {
          authorId: session.user.id
        }
      },
      include: {
        announcement: true,
        deliverer: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Livraison non trouvée' },
        { status: 404 }
      )
    }

    if (action === 'validate') {
      // Valider la réception de la livraison
      if (delivery.status !== 'DELIVERED') {
        return NextResponse.json(
          { error: 'Seules les livraisons livrées peuvent être validées' },
          { status: 400 }
        )
      }

      const updatedDelivery = await prisma.$transaction(async (tx) => {
        // Marquer comme complété
        const completed = await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status: 'COMPLETED',
            actualDeliveryTime: new Date()
          }
        })

        // Créer un suivi automatique
        await tx.deliveryTracking.create({
          data: {
            deliveryId,
            status: 'COMPLETED',
            location: delivery.announcement.deliveryAddress,
            notes: 'Livraison validée par le client',
            timestamp: new Date()
          }
        })

        // Mettre à jour les statistiques du livreur
        await tx.delivererProfile.update({
          where: { userId: delivery.delivererId },
          data: {
            completedDeliveries: {
              increment: 1
            }
          }
        })

        return completed
      })

      return NextResponse.json({
        success: true,
        message: 'Livraison validée avec succès',
        delivery: updatedDelivery
      })

    } else if (action === 'rate') {
      // Évaluer la livraison
      if (delivery.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Seules les livraisons complétées peuvent être évaluées' },
          { status: 400 }
        )
      }

      if (delivery.rating) {
        return NextResponse.json(
          { error: 'Cette livraison a déjà été évaluée' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const { rating, review, tips } = rateDeliverySchema.parse(body)

      const updatedDelivery = await prisma.$transaction(async (tx) => {
        // Ajouter l'évaluation
        const rated = await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            rating,
            review,
            tips: tips || 0
          }
        })

        // Mettre à jour la note moyenne du livreur
        const delivererStats = await tx.delivery.aggregate({
          where: {
            delivererId: delivery.delivererId,
            rating: { not: null }
          },
          _avg: { rating: true },
          _count: { rating: true }
        })

        if (delivererStats._avg.rating) {
          await tx.delivererProfile.update({
            where: { userId: delivery.delivererId },
            data: {
              rating: delivererStats._avg.rating,
              totalRatings: delivererStats._count.rating
            }
          })
        }

        // Ajouter les pourboires au portefeuille du livreur
        if (tips && tips > 0) {
          await tx.wallet.upsert({
            where: { userId: delivery.delivererId },
            create: {
              userId: delivery.delivererId,
              balance: tips,
              pendingBalance: 0
            },
            update: {
              balance: { increment: tips }
            }
          })

          // Créer une transaction de pourboire
          await tx.transaction.create({
            data: {
              fromUserId: session.user.id,
              toUserId: delivery.delivererId,
              amount: tips,
              type: 'TIPS',
              status: 'COMPLETED',
              description: `Pourboire pour livraison ${delivery.id}`
            }
          })
        }

        return rated
      })

      return NextResponse.json({
        success: true,
        message: 'Évaluation enregistrée avec succès',
        delivery: updatedDelivery
      })

    } else {
      return NextResponse.json(
        { error: 'Action non valide' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing delivery action:', error)

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

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
