import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { handleApiError, createError } from '@/lib/errors'
import { ecoLogger } from '@/lib/logger'

const interventionFilterSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  clientId: z.string().optional(),
  serviceType: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10)
})

const updateInterventionSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
  actualStartTime: z.string().datetime().optional(),
  actualEndTime: z.string().datetime().optional(),
  materials: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    cost: z.number().optional()
  })).optional(),
  photos: z.array(z.string()).optional(), // URLs des photos
  clientSignature: z.string().optional(), // Base64 de la signature
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional()
})

// GET - Récupérer les interventions du prestataire
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const { searchParams } = new URL(request.url)
    const filters = interventionFilterSchema.parse({
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      serviceType: searchParams.get('serviceType') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10')
    })

    const whereClause = {
      providerId: session.user.id,
      ...(filters.status && { status: filters.status }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.dateFrom || filters.dateTo) && {
        scheduledDate: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) })
        }
      },
      ...(filters.serviceType && {
        service: {
          category: filters.serviceType
        }
      })
    }

    const [interventions, totalCount] = await Promise.all([
      prisma.serviceBooking.findMany({
        where: whereClause,
        orderBy: [
          { scheduledDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              profilePicture: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              category: true,
              description: true,
              duration: true,
              basePrice: true
            }
          },
          address: true,
          interventionReport: true,
          review: true
        }
      }),
      prisma.serviceBooking.count({ where: whereClause })
    ])

    // Calculer les statistiques du provider
    const stats = await calculateProviderStats(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        interventions,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / filters.limit)
        },
        statistics: stats
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Créer une nouvelle intervention (généralement depuis une réservation)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const body = await request.json()
    const createSchema = z.object({
      clientId: z.string(),
      serviceId: z.string(),
      scheduledDate: z.string().datetime(),
      duration: z.number().min(30).max(480), // 30 min à 8h
      notes: z.string().optional(),
      customPrice: z.number().min(0).optional(),
      addressId: z.string().optional(),
      emergencyContact: z.object({
        name: z.string(),
        phone: z.string()
      }).optional()
    })

    const validatedData = createSchema.parse(body)

    // Vérifier que le service appartient au prestataire
    const service = await prisma.providerService.findFirst({
      where: {
        id: validatedData.serviceId,
        providerId: session.user.id,
        isActive: true
      }
    })

    if (!service) {
      return handleApiError(createError.validation.invalidCredentials('Service non trouvé ou inactif'))
    }

    // Vérifier la disponibilité du créneau
    const scheduledDate = new Date(validatedData.scheduledDate)
    const conflictingBooking = await prisma.serviceBooking.findFirst({
      where: {
        providerId: session.user.id,
        scheduledDate: {
          lte: new Date(scheduledDate.getTime() + validatedData.duration * 60000),
        },
        endTime: {
          gte: scheduledDate
        },
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS']
        }
      }
    })

    if (conflictingBooking) {
      return handleApiError(createError.validation.conflict('Créneau déjà occupé'))
    }

    // Calculer le prix final
    const finalPrice = validatedData.customPrice || service.basePrice

    // Créer l'intervention
    const intervention = await prisma.serviceBooking.create({
      data: {
        clientId: validatedData.clientId,
        providerId: session.user.id,
        serviceId: validatedData.serviceId,
        scheduledDate,
        endTime: new Date(scheduledDate.getTime() + validatedData.duration * 60000),
        duration: validatedData.duration,
        totalPrice: finalPrice,
        status: 'CONFIRMED',
        notes: validatedData.notes,
        addressId: validatedData.addressId,
        emergencyContact: validatedData.emergencyContact
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        service: true,
        address: true
      }
    })

    ecoLogger.system.notificationSent(
      validatedData.clientId,
      'intervention_scheduled',
      'in-app'
    )

    return NextResponse.json({
      success: true,
      message: 'Intervention programmée avec succès',
      data: intervention
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Mettre à jour une intervention
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const { searchParams } = new URL(request.url)
    const interventionId = searchParams.get('id')

    if (!interventionId) {
      return handleApiError(createError.validation.required('id'))
    }

    const body = await request.json()
    const validatedData = updateInterventionSchema.parse(body)

    // Vérifier que l'intervention appartient au prestataire
    const intervention = await prisma.serviceBooking.findFirst({
      where: {
        id: interventionId,
        providerId: session.user.id
      },
      include: {
        client: true,
        service: true
      }
    })

    if (!intervention) {
      return handleApiError(createError.validation.notFound('Intervention non trouvée'))
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      status: validatedData.status,
      notes: validatedData.notes,
      ...(validatedData.actualStartTime && {
        actualStartTime: new Date(validatedData.actualStartTime)
      }),
      ...(validatedData.actualEndTime && {
        actualEndTime: new Date(validatedData.actualEndTime)
      })
    }

    // Si l'intervention est complétée, créer le rapport
    if (validatedData.status === 'COMPLETED') {
      updateData.completedAt = new Date()
      
      // Créer le rapport d'intervention
      await prisma.interventionReport.create({
        data: {
          bookingId: interventionId,
          providerId: session.user.id,
          materials: validatedData.materials || [],
          photos: validatedData.photos || [],
          clientSignature: validatedData.clientSignature,
          providerNotes: validatedData.notes,
          completedAt: new Date()
        }
      })

      // Si une évaluation est fournie
      if (validatedData.rating) {
        await prisma.serviceReview.create({
          data: {
            bookingId: interventionId,
            clientId: intervention.clientId,
            providerId: session.user.id,
            rating: validatedData.rating,
            comment: validatedData.feedback,
            reviewType: 'PROVIDER_TO_CLIENT'
          }
        })
      }
    }

    // Mettre à jour l'intervention
    const updatedIntervention = await prisma.serviceBooking.update({
      where: { id: interventionId },
      data: updateData,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        service: true,
        address: true,
        interventionReport: true,
        review: true
      }
    })

    // Envoyer une notification au client
    ecoLogger.system.notificationSent(
      intervention.clientId,
      `intervention_${validatedData.status.toLowerCase()}`,
      'push'
    )

    return NextResponse.json({
      success: true,
      message: 'Intervention mise à jour avec succès',
      data: updatedIntervention
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// Fonction pour calculer les statistiques du prestataire
async function calculateProviderStats(providerId: string) {
  const [
    totalInterventions,
    completedInterventions,
    pendingInterventions,
    monthlyRevenue,
    averageRating,
    clientCount
  ] = await Promise.all([
    // Total des interventions
    prisma.serviceBooking.count({
      where: { providerId }
    }),
    
    // Interventions complétées
    prisma.serviceBooking.count({
      where: { 
        providerId,
        status: 'COMPLETED'
      }
    }),
    
    // Interventions en attente
    prisma.serviceBooking.count({
      where: { 
        providerId,
        status: 'PENDING'
      }
    }),
    
    // Revenus du mois en cours
    prisma.serviceBooking.aggregate({
      where: {
        providerId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: {
        totalPrice: true
      }
    }),
    
    // Note moyenne
    prisma.serviceReview.aggregate({
      where: {
        providerId,
        reviewType: 'CLIENT_TO_PROVIDER'
      },
      _avg: {
        rating: true
      }
    }),
    
    // Nombre de clients uniques
    prisma.serviceBooking.findMany({
      where: { providerId },
      select: { clientId: true },
      distinct: ['clientId']
    }).then(clients => clients.length)
  ])

  // Taux de completion
  const completionRate = totalInterventions > 0 ? 
    (completedInterventions / totalInterventions) * 100 : 0

  // Interventions des 7 derniers jours
  const recentInterventions = await prisma.serviceBooking.findMany({
    where: {
      providerId,
      scheduledDate: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: { scheduledDate: 'asc' }
  })

  return {
    total: totalInterventions,
    completed: completedInterventions,
    pending: pendingInterventions,
    completionRate: Math.round(completionRate),
    monthlyRevenue: monthlyRevenue._sum.totalPrice || 0,
    averageRating: averageRating._avg.rating || 0,
    clientCount,
    recentInterventions: recentInterventions.length,
    upcomingToday: recentInterventions.filter(i => 
      new Date(i.scheduledDate).toDateString() === new Date().toDateString()
    ).length
  }
}