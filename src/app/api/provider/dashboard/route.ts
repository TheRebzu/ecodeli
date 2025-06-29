import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [GET /api/provider/dashboard] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil prestataire
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        services: {
          where: { isActive: true }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        documents: {
          where: { isActive: true }
        }
      }
    })

    if (!provider) {
      return NextResponse.json({ error: 'Profil prestataire non trouvé' }, { status: 404 })
    }

    // Récupérer les demandes de services
    const serviceRequests = await db.serviceRequest.findMany({
      where: {
        OR: [
          {
            assignedProviderId: provider.id
          },
          {
            AND: [
              { assignedProviderId: null },
              { status: 'ACTIVE' },
              {
                serviceType: {
                  in: provider.services.map(s => s.serviceType)
                }
              }
            ]
          }
        ]
      },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        applications: {
          where: { providerId: provider.id }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Calculer les statistiques
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const completedServices = await db.serviceRequest.findMany({
      where: {
        assignedProviderId: provider.id,
        status: 'COMPLETED'
      },
      include: {
        payment: true
      }
    })

    const thisMonthServices = completedServices.filter(s => 
      new Date(s.completedAt || s.updatedAt) >= thisMonth
    )

    const totalEarnings = completedServices.reduce((sum, service) => {
      if (service.payment?.status === 'PAID') {
        return sum + Number(service.payment.amount)
      }
      return sum
    }, 0)

    const thisMonthEarnings = thisMonthServices.reduce((sum, service) => {
      if (service.payment?.status === 'PAID') {
        return sum + Number(service.payment.amount)
      }
      return sum
    }, 0)

    // Calcul de la note moyenne
    const averageRating = provider.reviews.length > 0
      ? provider.reviews.reduce((sum, review) => sum + review.rating, 0) / provider.reviews.length
      : 0

    // Disponibilités cette semaine
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    const availabilities = await db.providerAvailability.findMany({
      where: {
        providerId: provider.id,
        date: {
          gte: startOfWeek,
          lt: endOfWeek
        }
      },
      orderBy: { date: 'asc' }
    })

    const result = {
      provider: {
        id: provider.id,
        businessName: provider.businessName,
        businessType: provider.businessType,
        siret: provider.siret,
        status: provider.status,
        isValidated: provider.isValidated,
        validationLevel: provider.validationLevel,
        validatedAt: provider.validatedAt?.toISOString(),
        hourlyRate: Number(provider.hourlyRate),
        rating: averageRating,
        totalReviews: provider.reviews.length,
        createdAt: provider.createdAt.toISOString(),
        
        user: {
          id: provider.user.id,
          email: provider.user.email,
          profile: provider.user.profile ? {
            firstName: provider.user.profile.firstName,
            lastName: provider.user.profile.lastName,
            phone: provider.user.profile.phone,
            address: provider.user.profile.address,
            city: provider.user.profile.city,
            postalCode: provider.user.profile.postalCode
          } : null
        },
        
        services: provider.services.map(service => ({
          id: service.id,
          serviceType: service.serviceType,
          name: service.name,
          description: service.description,
          basePrice: Number(service.basePrice),
          duration: service.duration,
          isActive: service.isActive
        })),
        
        documents: provider.documents.map(doc => ({
          id: doc.id,
          type: doc.type,
          status: doc.status,
          validatedAt: doc.validatedAt?.toISOString()
        }))
      },
      
      statistics: {
        totalServices: completedServices.length,
        thisMonthServices: thisMonthServices.length,
        totalEarnings,
        thisMonthEarnings,
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews: provider.reviews.length,
        activeServices: provider.services.filter(s => s.isActive).length,
        pendingRequests: serviceRequests.filter(r => r.status === 'ACTIVE' && !r.assignedProviderId).length,
        assignedRequests: serviceRequests.filter(r => r.assignedProviderId === provider.id && ['BOOKED', 'IN_PROGRESS'].includes(r.status)).length
      },
      
      recentRequests: serviceRequests.map(request => ({
        id: request.id,
        title: request.title,
        description: request.description,
        serviceType: request.serviceType,
        status: request.status,
        budget: Number(request.budget),
        duration: request.duration,
        scheduledAt: request.scheduledAt?.toISOString(),
        isRecurring: request.isRecurring,
        urgency: request.urgency,
        address: request.address,
        city: request.city,
        createdAt: request.createdAt.toISOString(),
        
        client: {
          id: request.client.id,
          name: request.client.user.profile 
            ? `${request.client.user.profile.firstName || ''} ${request.client.user.profile.lastName || ''}`.trim()
            : request.client.user.email,
          rating: request.client.rating
        },
        
        hasApplied: request.applications.length > 0,
        isAssigned: request.assignedProviderId === provider.id
      })),
      
      recentReviews: provider.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        client: {
          name: review.client.user.profile 
            ? `${review.client.user.profile.firstName || ''} ${review.client.user.profile.lastName || ''}`.trim()
            : review.client.user.email
        }
      })),
      
      weeklyAvailabilities: availabilities.map(avail => ({
        id: avail.id,
        date: avail.date.toISOString(),
        startTime: avail.startTime,
        endTime: avail.endTime,
        isAvailable: avail.isAvailable,
        maxServices: avail.maxServices,
        currentBookings: avail.currentBookings
      }))
    }

    console.log(`✅ Dashboard data récupéré pour prestataire ${provider.id}`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erreur récupération dashboard prestataire:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}