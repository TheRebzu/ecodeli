import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema de validation pour les disponibilités
const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
  isAvailable: z.boolean(),
  maxDeliveries: z.number().min(1).max(20).optional(),
  zones: z.array(z.string()).optional(),
  notes: z.string().max(200).optional()
})

const bulkAvailabilitySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pattern: z.object({
    monday: z.object({
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxDeliveries: z.number().optional()
    }).optional(),
    tuesday: z.object({
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxDeliveries: z.number().optional()
    }).optional(),
    wednesday: z.object({
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxDeliveries: z.number().optional()
    }).optional(),
    thursday: z.object({
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxDeliveries: z.number().optional()
    }).optional(),
    friday: z.object({
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxDeliveries: z.number().optional()
    }).optional(),
    saturday: z.object({
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxDeliveries: z.number().optional()
    }).optional(),
    sunday: z.object({
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      maxDeliveries: z.number().optional()
    }).optional()
  })
})

// GET - Récupérer le planning du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const month = searchParams.get('month') // Format: YYYY-MM

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Définir la période par défaut (mois actuel)
    let periodStart: Date
    let periodEnd: Date

    if (startDate && endDate) {
      periodStart = new Date(startDate)
      periodEnd = new Date(endDate)
    } else if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      periodStart = new Date(year, monthNum - 1, 1)
      periodEnd = new Date(year, monthNum, 0)
    } else {
      const now = new Date()
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // Récupérer les disponibilités
    const availabilities = await prisma.availability.findMany({
      where: {
        delivererId: deliverer.id,
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Récupérer les livraisons planifiées pour la période
    const scheduledDeliveries = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        scheduledPickupTime: {
          gte: periodStart,
          lte: periodEnd
        },
        status: {
          in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
        }
      },
      include: {
        announcement: {
          select: {
            title: true,
            type: true,
            pickupLocation: true,
            deliveryLocation: true
          }
        }
      },
      orderBy: {
        scheduledPickupTime: 'asc'
      }
    })

    // Récupérer les routes planifiées
    const plannedRoutes = await prisma.route.findMany({
      where: {
        delivererId: deliverer.id,
        departureDate: {
          gte: periodStart,
          lte: periodEnd
        },
        isActive: true
      },
      include: {
        matchedAnnouncements: {
          include: {
            announcement: {
              select: {
                title: true,
                type: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        departureDate: 'asc'
      }
    })

    // Calculer les statistiques de planning
    const stats = {
      totalAvailableDays: availabilities.filter(a => a.isAvailable).length,
      totalUnavailableDays: availabilities.filter(a => !a.isAvailable).length,
      scheduledDeliveries: scheduledDeliveries.length,
      plannedRoutes: plannedRoutes.length,
      averageDeliveriesPerDay: availabilities.length > 0 ? 
        scheduledDeliveries.length / availabilities.filter(a => a.isAvailable).length : 0
    }

    return NextResponse.json({
      period: {
        start: periodStart,
        end: periodEnd
      },
      availabilities,
      scheduledDeliveries,
      plannedRoutes,
      stats
    })

  } catch (error) {
    return handleApiError(error, 'fetching deliverer planning')
  }
}

// POST - Créer ou mettre à jour la disponibilité
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const { bulk, ...availabilityData } = body

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (bulk) {
      // Gestion en lot
      const validatedData = bulkAvailabilitySchema.parse(body)
      const startDate = new Date(validatedData.startDate)
      const endDate = new Date(validatedData.endDate)
      
      if (startDate >= endDate) {
        return NextResponse.json({ 
          error: 'End date must be after start date' 
        }, { status: 400 })
      }

      const createdAvailabilities = []
      const currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()]
        const dayPattern = validatedData.pattern[dayName as keyof typeof validatedData.pattern]

        if (dayPattern) {
          const availability = await prisma.availability.upsert({
            where: {
              delivererId_date: {
                delivererId: deliverer.id,
                date: new Date(currentDate)
              }
            },
            update: {
              isAvailable: dayPattern.isAvailable,
              startTime: dayPattern.startTime,
              endTime: dayPattern.endTime,
              maxDeliveries: dayPattern.maxDeliveries
            },
            create: {
              delivererId: deliverer.id,
              date: new Date(currentDate),
              isAvailable: dayPattern.isAvailable,
              startTime: dayPattern.startTime,
              endTime: dayPattern.endTime,
              maxDeliveries: dayPattern.maxDeliveries
            }
          })
          createdAvailabilities.push(availability)
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      return NextResponse.json({
        success: true,
        message: `${createdAvailabilities.length} disponibilités mises à jour`,
        availabilities: createdAvailabilities
      }, { status: 201 })

    } else {
      // Gestion unitaire
      const validatedData = availabilitySchema.parse(availabilityData)
      
      // Vérifier que la date n'est pas dans le passé
      const availabilityDate = new Date(validatedData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (availabilityDate < today) {
        return NextResponse.json({ 
          error: 'Cannot set availability for past dates' 
        }, { status: 400 })
      }

      // Vérifier la cohérence des heures
      if (validatedData.startTime >= validatedData.endTime) {
        return NextResponse.json({ 
          error: 'End time must be after start time' 
        }, { status: 400 })
      }

      // Vérifier les conflits avec les livraisons existantes
      if (!validatedData.isAvailable) {
        const existingDeliveries = await prisma.delivery.count({
          where: {
            delivererId: deliverer.id,
            scheduledPickupTime: {
              gte: availabilityDate,
              lt: new Date(availabilityDate.getTime() + 24 * 60 * 60 * 1000)
            },
            status: {
              in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
            }
          }
        })

        if (existingDeliveries > 0) {
          return NextResponse.json({ 
            error: `Cannot set unavailable: ${existingDeliveries} delivery(ies) already scheduled for this date` 
          }, { status: 409 })
        }
      }

      const availability = await prisma.availability.upsert({
        where: {
          delivererId_date: {
            delivererId: deliverer.id,
            date: availabilityDate
          }
        },
        update: {
          isAvailable: validatedData.isAvailable,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          maxDeliveries: validatedData.maxDeliveries,
          zones: validatedData.zones,
          notes: validatedData.notes
        },
        create: {
          delivererId: deliverer.id,
          date: availabilityDate,
          isAvailable: validatedData.isAvailable,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          maxDeliveries: validatedData.maxDeliveries,
          zones: validatedData.zones || [],
          notes: validatedData.notes
        }
      })

      return NextResponse.json({
        success: true,
        availability,
        message: 'Disponibilité mise à jour avec succès'
      }, { status: 201 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating deliverer availability')
  }
}

// DELETE - Supprimer une disponibilité
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    const availabilityDate = new Date(date)
    
    // Vérifier qu'il n'y a pas de livraisons planifiées
    const existingDeliveries = await prisma.delivery.count({
      where: {
        delivererId: deliverer.id,
        scheduledPickupTime: {
          gte: availabilityDate,
          lt: new Date(availabilityDate.getTime() + 24 * 60 * 60 * 1000)
        },
        status: {
          in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
        }
      }
    })

    if (existingDeliveries > 0) {
      return NextResponse.json({ 
        error: `Cannot delete availability: ${existingDeliveries} delivery(ies) scheduled for this date` 
      }, { status: 409 })
    }

    // Supprimer la disponibilité
    const deleted = await prisma.availability.deleteMany({
      where: {
        delivererId: deliverer.id,
        date: availabilityDate
      }
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Disponibilité supprimée avec succès'
    })

  } catch (error) {
    return handleApiError(error, 'deleting deliverer availability')
  }
}
