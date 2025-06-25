import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour créer une évaluation
const createReviewSchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(['DELIVERER', 'PROVIDER']),
  deliveryId: z.string().cuid().optional(),
  bookingId: z.string().cuid().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500).optional(),
  criteria: z.object({
    punctuality: z.number().min(1).max(5).optional(),
    communication: z.number().min(1).max(5).optional(),
    professionalism: z.number().min(1).max(5).optional(),
    quality: z.number().min(1).max(5).optional()
  }).optional()
})

// Schema pour mettre à jour une évaluation
const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(10).max(500).optional(),
  criteria: z.object({
    punctuality: z.number().min(1).max(5).optional(),
    communication: z.number().min(1).max(5).optional(),
    professionalism: z.number().min(1).max(5).optional(),
    quality: z.number().min(1).max(5).optional()
  }).optional()
})

// GET - Liste des évaluations du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const targetType = searchParams.get('targetType')
    const rating = searchParams.get('rating')

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const where: any = { clientId: client.id }
    if (targetType) where.targetType = targetType
    if (rating) where.rating = parseInt(rating)

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          delivery: {
            include: {
              announcement: { select: { title: true } },
              deliverer: {
                select: { profile: { select: { firstName: true, lastName: true, avatar: true } } }
              }
            }
          },
          booking: {
            include: {
              service: { select: { name: true } },
              provider: {
                select: { profile: { select: { firstName: true, lastName: true, avatar: true } } }
              }
            }
          }
        }
      }),
      prisma.review.count({ where })
    ])

    // Statistiques des évaluations
    const stats = await prisma.review.aggregate({
      where: { clientId: client.id },
      _avg: { rating: true },
      _count: { id: true }
    })

    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { clientId: client.id },
      _count: { id: true }
    })

    return NextResponse.json({
      reviews: reviews.map(review => ({
        ...review,
        target: review.targetType === 'DELIVERER' 
          ? review.delivery?.deliverer?.profile 
          : review.booking?.provider?.profile,
        service: review.targetType === 'DELIVERER'
          ? review.delivery?.announcement?.title
          : review.booking?.service?.name,
        canEdit: isReviewEditable(review.createdAt),
        timeAgo: getTimeAgo(review.createdAt)
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        averageRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
        totalReviews: stats._count.id,
        distribution: ratingDistribution.reduce((acc, item) => {
          acc[item.rating] = item._count.id
          return acc
        }, {} as Record<number, number>)
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching reviews')
  }
}

// POST - Créer une nouvelle évaluation
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createReviewSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Vérifier que le client peut évaluer cette entité
    let canReview = false

    if (validatedData.targetType === 'DELIVERER' && validatedData.deliveryId) {
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: validatedData.deliveryId,
          announcement: { clientId: client.id },
          status: 'DELIVERED'
        }
      })
      canReview = !!delivery
    }

    if (validatedData.targetType === 'PROVIDER' && validatedData.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: validatedData.bookingId,
          clientId: client.id,
          status: 'COMPLETED'
        }
      })
      canReview = !!booking
    }

    if (!canReview) {
      return NextResponse.json({ 
        error: 'Vous ne pouvez évaluer que les services terminés' 
      }, { status: 403 })
    }

    // Vérifier qu'il n'y a pas déjà une évaluation
    const existingReview = await prisma.review.findFirst({
      where: {
        clientId: client.id,
        deliveryId: validatedData.deliveryId,
        bookingId: validatedData.bookingId
      }
    })

    if (existingReview) {
      return NextResponse.json({ 
        error: 'Vous avez déjà évalué ce service' 
      }, { status: 409 })
    }

    const review = await prisma.$transaction(async (tx) => {
      // Créer l'évaluation
      const newReview = await tx.review.create({
        data: {
          clientId: client.id,
          targetId: validatedData.targetId,
          targetType: validatedData.targetType,
          deliveryId: validatedData.deliveryId,
          bookingId: validatedData.bookingId,
          rating: validatedData.rating,
          comment: validatedData.comment,
          criteria: validatedData.criteria || {}
        }
      })

      // Mettre à jour la moyenne de l'entité évaluée
      if (validatedData.targetType === 'DELIVERER') {
        await updateDelivererRating(tx, validatedData.targetId)
      } else {
        await updateProviderRating(tx, validatedData.targetId)
      }

      return newReview
    })

    return NextResponse.json({
      success: true,
      message: 'Évaluation créée avec succès',
      review
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'creating review')
  }
}

// PUT - Mettre à jour une évaluation
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('id')

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateReviewSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        clientId: client.id
      }
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Vérifier si modifiable (max 7 jours)
    if (!isReviewEditable(review.createdAt)) {
      return NextResponse.json({ 
        error: 'Cette évaluation ne peut plus être modifiée' 
      }, { status: 403 })
    }

    const updatedReview = await prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...validatedData,
          criteria: validatedData.criteria ? 
            { ...review.criteria, ...validatedData.criteria } : 
            review.criteria
        }
      })

      // Recalculer la moyenne si la note a changé
      if (validatedData.rating && validatedData.rating !== review.rating) {
        if (review.targetType === 'DELIVERER') {
          await updateDelivererRating(tx, review.targetId)
        } else {
          await updateProviderRating(tx, review.targetId)
        }
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      message: 'Évaluation mise à jour avec succès',
      review: updatedReview
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating review')
  }
}

// Fonctions utilitaires
async function updateDelivererRating(tx: any, delivererId: string) {
  const avgRating = await tx.review.aggregate({
    where: { targetId: delivererId, targetType: 'DELIVERER' },
    _avg: { rating: true }
  })

  await tx.deliverer.update({
    where: { id: delivererId },
    data: { averageRating: avgRating._avg.rating || 0 }
  })
}

async function updateProviderRating(tx: any, providerId: string) {
  const avgRating = await tx.review.aggregate({
    where: { targetId: providerId, targetType: 'PROVIDER' },
    _avg: { rating: true }
  })

  await tx.provider.update({
    where: { id: providerId },
    data: { averageRating: avgRating._avg.rating || 0 }
  })
}

function isReviewEditable(createdAt: Date): boolean {
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 7
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays > 0) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours > 0) return `Il y a ${diffHours}h`
  return 'À l\'instant'
} 