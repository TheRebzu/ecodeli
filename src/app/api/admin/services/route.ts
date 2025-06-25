import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour création/modification de service
const serviceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  category: z.enum(['CLEANING', 'PLUMBING', 'ELECTRICAL', 'GARDENING', 'PAINTING', 'MOVING', 'REPAIR', 'ASSEMBLY', 'OTHER']),
  basePrice: z.number().min(0),
  priceUnit: z.enum(['HOUR', 'FLAT_RATE', 'PER_ITEM']),
  duration: z.number().min(15).max(480), // minutes
  isActive: z.boolean().default(true),
  requiredSkills: z.array(z.string()).optional(),
  requiredCertifications: z.array(z.string()).optional(),
  minimumRating: z.number().min(0).max(5).optional(),
  maxBookingsPerDay: z.number().min(1).max(20).optional(),
  advanceBookingDays: z.number().min(0).max(90).default(7),
  cancellationPolicy: z.enum(['FLEXIBLE', 'MODERATE', 'STRICT']).default('MODERATE')
})

// Schema pour actions sur les services
const serviceActionSchema = z.object({
  serviceId: z.string().cuid(),
  action: z.enum(['ACTIVATE', 'DEACTIVATE', 'ARCHIVE', 'UPDATE_PRICING']),
  reason: z.string().min(5).max(500).optional(),
  newPrice: z.number().min(0).optional()
})

// GET - Liste de tous les services avec gestion administrative
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status') // 'active', 'inactive', 'archived'
    const providerId = searchParams.get('providerId')
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construire les conditions WHERE
    const whereConditions: any = {}

    if (category) whereConditions.category = category
    if (providerId) whereConditions.providerId = providerId
    
    if (status) {
      switch (status) {
        case 'active':
          whereConditions.isActive = true
          whereConditions.archivedAt = null
          break
        case 'inactive':
          whereConditions.isActive = false
          whereConditions.archivedAt = null
          break
        case 'archived':
          whereConditions.archivedAt = { not: null }
          break
      }
    }

    // Récupérer les services avec statistiques
    const services = await prisma.providerService.findMany({
      where: whereConditions,
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        },
        bookings: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true,
            rating: true
          }
        },
        _count: {
          select: {
            bookings: true,
            reviews: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    // Enrichir les données avec les statistiques
    const enrichedServices = await Promise.all(
      services.map(async service => {
        const bookings = service.bookings
        const completedBookings = bookings.filter(b => b.status === 'COMPLETED')
        
        // Calculer les statistiques
        const stats = {
          totalBookings: bookings.length,
          completedBookings: completedBookings.length,
          totalRevenue: completedBookings.reduce((sum, b) => sum + b.totalPrice, 0),
          averageRating: completedBookings.length > 0 
            ? completedBookings.reduce((sum, b) => sum + (b.rating || 0), 0) / completedBookings.length
            : 0,
          bookingsThisMonth: bookings.filter(b => {
            const bookingDate = new Date(b.createdAt)
            const now = new Date()
            return bookingDate.getMonth() === now.getMonth() && 
                   bookingDate.getFullYear() === now.getFullYear()
          }).length
        }

        // Analyser la performance
        const performance = analyzeServicePerformance(service, stats)
        
        return {
          ...service,
          provider: {
            ...service.provider,
            fullName: `${service.provider.user.profile?.firstName || ''} ${service.provider.user.profile?.lastName || ''}`.trim()
          },
          stats,
          performance,
          canModify: true,
          lastBooking: bookings[0]?.createdAt || null,
          riskFactors: identifyRiskFactors(service, stats)
        }
      })
    )

    // Filtrer par rating si demandé
    const filteredServices = minRating 
      ? enrichedServices.filter(s => s.stats.averageRating >= minRating)
      : enrichedServices

    // Calculer les statistiques globales
    const globalStats = await calculateServiceStats(whereConditions)

    return NextResponse.json({
      services: filteredServices,
      stats: globalStats,
      pagination: {
        total: filteredServices.length,
        limit,
        offset,
        hasMore: services.length === limit
      },
      filters: {
        categories: ['CLEANING', 'PLUMBING', 'ELECTRICAL', 'GARDENING', 'PAINTING', 'MOVING', 'REPAIR', 'ASSEMBLY', 'OTHER'],
        statuses: ['active', 'inactive', 'archived']
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching services for admin')
  }
}

// POST - Créer un nouveau service (Admin seulement)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = serviceSchema.parse(body)
    const { providerId } = body

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })
    }

    // Vérifier que le prestataire existe
    const provider = await prisma.provider.findUnique({
      where: { userId: providerId }
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Créer le service
    const service = await prisma.providerService.create({
      data: {
        ...validatedData,
        providerId: provider.id,
        createdBy: session.user.id
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                email: true,
                profile: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        }
      }
    })

    // Notification au prestataire
    await prisma.notification.create({
      data: {
        userId: providerId,
        type: 'SERVICE_CREATED',
        title: 'Nouveau service créé',
        message: `Un nouveau service "${validatedData.name}" a été créé pour vous par l'administration.`,
        data: {
          serviceId: service.id,
          serviceName: validatedData.name
        }
      }
    })

    // Log pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SERVICE_CREATED',
        entity: 'ProviderService',
        entityId: service.id,
        details: {
          serviceName: validatedData.name,
          providerId,
          category: validatedData.category,
          basePrice: validatedData.basePrice
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Service created successfully',
      service
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'creating service')
  }
}

// PATCH - Actions administratives sur les services
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = serviceActionSchema.parse(body)

    // Récupérer le service
    const service = await prisma.providerService.findUnique({
      where: { id: validatedData.serviceId },
      include: {
        provider: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    let updateData: any = {}
    let notificationMessage = ''

    switch (validatedData.action) {
      case 'ACTIVATE':
        updateData = { isActive: true }
        notificationMessage = `Votre service "${service.name}" a été activé.`
        break
      case 'DEACTIVATE':
        updateData = { isActive: false, deactivatedAt: new Date() }
        notificationMessage = `Votre service "${service.name}" a été désactivé. ${validatedData.reason ? `Raison: ${validatedData.reason}` : ''}`
        break
      case 'ARCHIVE':
        updateData = { isActive: false, archivedAt: new Date() }
        notificationMessage = `Votre service "${service.name}" a été archivé. ${validatedData.reason ? `Raison: ${validatedData.reason}` : ''}`
        break
      case 'UPDATE_PRICING':
        if (!validatedData.newPrice) {
          return NextResponse.json({ error: 'New price is required for pricing update' }, { status: 400 })
        }
        updateData = { basePrice: validatedData.newPrice }
        notificationMessage = `Le prix de votre service "${service.name}" a été mis à jour à ${validatedData.newPrice}¬.`
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Mettre à jour le service
    const updatedService = await prisma.providerService.update({
      where: { id: validatedData.serviceId },
      data: {
        ...updateData,
        lastModifiedBy: session.user.id,
        adminNotes: validatedData.reason
      }
    })

    // Notification au prestataire
    await prisma.notification.create({
      data: {
        userId: service.provider.user.id,
        type: `SERVICE_${validatedData.action}D`,
        title: `Service ${validatedData.action.toLowerCase()}`,
        message: notificationMessage,
        data: {
          serviceId: service.id,
          action: validatedData.action,
          reason: validatedData.reason
        }
      }
    })

    // Log pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `SERVICE_${validatedData.action}`,
        entity: 'ProviderService',
        entityId: service.id,
        details: {
          serviceName: service.name,
          providerId: service.provider.user.id,
          previousStatus: service.isActive ? 'ACTIVE' : 'INACTIVE',
          newPrice: validatedData.newPrice,
          reason: validatedData.reason
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Service ${validatedData.action.toLowerCase()}d successfully`,
      service: updatedService
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'updating service')
  }
}

// DELETE - Supprimer définitivement un service (Admin seulement)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('id')

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas de réservations actives
    const activeBookings = await prisma.serviceBooking.count({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
      }
    })

    if (activeBookings > 0) {
      return NextResponse.json({
        error: 'Cannot delete service with active bookings',
        activeBookings
      }, { status: 409 })
    }

    // Supprimer le service
    const deletedService = await prisma.providerService.delete({
      where: { id: serviceId }
    })

    // Log pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SERVICE_DELETED',
        entity: 'ProviderService',
        entityId: serviceId,
        details: {
          serviceName: deletedService.name,
          providerId: deletedService.providerId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    })

  } catch (error) {
    return handleApiError(error, 'deleting service')
  }
}

// Fonctions utilitaires
async function calculateServiceStats(whereConditions: any) {
  const totalServices = await prisma.providerService.count({ where: whereConditions })
  
  const categoryStats = await prisma.providerService.groupBy({
    where: whereConditions,
    by: ['category'],
    _count: { category: true },
    _avg: { basePrice: true }
  })

  const statusStats = await prisma.providerService.groupBy({
    where: whereConditions,
    by: ['isActive'],
    _count: { isActive: true }
  })

  return {
    total: totalServices,
    byCategory: categoryStats.reduce((acc, stat) => {
      acc[stat.category] = {
        count: stat._count.category,
        averagePrice: stat._avg.basePrice || 0
      }
      return acc
    }, {} as Record<string, any>),
    byStatus: {
      active: statusStats.find(s => s.isActive)?._count.isActive || 0,
      inactive: statusStats.find(s => !s.isActive)?._count.isActive || 0
    }
  }
}

function analyzeServicePerformance(service: any, stats: any) {
  const performance = {
    bookingRate: 'LOW',
    revenueRate: 'LOW',
    customerSatisfaction: 'MEDIUM',
    overall: 'NEEDS_IMPROVEMENT'
  }

  // Taux de réservation
  if (stats.bookingsThisMonth >= 10) performance.bookingRate = 'HIGH'
  else if (stats.bookingsThisMonth >= 5) performance.bookingRate = 'MEDIUM'

  // Revenus
  if (stats.totalRevenue >= 1000) performance.revenueRate = 'HIGH'
  else if (stats.totalRevenue >= 500) performance.revenueRate = 'MEDIUM'

  // Satisfaction client
  if (stats.averageRating >= 4.5) performance.customerSatisfaction = 'HIGH'
  else if (stats.averageRating >= 3.5) performance.customerSatisfaction = 'MEDIUM'
  else performance.customerSatisfaction = 'LOW'

  // Performance globale
  const scores = [performance.bookingRate, performance.revenueRate, performance.customerSatisfaction]
  const highCount = scores.filter(s => s === 'HIGH').length
  const mediumCount = scores.filter(s => s === 'MEDIUM').length

  if (highCount >= 2) performance.overall = 'EXCELLENT'
  else if (highCount >= 1 && mediumCount >= 1) performance.overall = 'GOOD'
  else if (mediumCount >= 2) performance.overall = 'AVERAGE'

  return performance
}

function identifyRiskFactors(service: any, stats: any): string[] {
  const risks = []

  if (stats.averageRating < 3.0) risks.push('Low customer rating')
  if (stats.bookingsThisMonth === 0) risks.push('No recent bookings')
  if (service.basePrice > 200) risks.push('High pricing')
  if (!service.isActive) risks.push('Service inactive')
  
  return risks
}