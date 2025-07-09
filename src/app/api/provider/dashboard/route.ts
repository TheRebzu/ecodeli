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
            profile: true,
            documents: {
              where: { validationStatus: 'APPROVED' }
            }
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
        }
      }
    })

    if (!provider) {
      return NextResponse.json({ error: 'Profil prestataire non trouvé' }, { status: 404 })
    }

    // Récupérer les réservations de services
    const bookings = await db.booking.findMany({
      where: {
        providerId: provider.id
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
        service: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Calculer les statistiques
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const completedServices = await db.booking.findMany({
      where: {
        providerId: provider.id,
        status: 'COMPLETED'
      },
      include: {
        payment: true
      }
    })

    const thisMonthServices = completedServices.filter(s => 
      new Date(s.updatedAt) >= thisMonth
    )

    const totalEarnings = completedServices.reduce((sum, service) => {
      if (service.payment?.status === 'COMPLETED') {
        return sum + Number(service.payment.amount)
      }
      return sum
    }, 0)

    const thisMonthEarnings = thisMonthServices.reduce((sum, service) => {
      if (service.payment?.status === 'COMPLETED') {
        return sum + Number(service.payment.amount)
      }
      return sum
    }, 0)

    // Calcul de la note moyenne
    const averageRating = provider.reviews.length > 0
      ? provider.reviews.reduce((sum, review) => sum + review.rating, 0) / provider.reviews.length
      : 0

    // Disponibilités récurrentes par jour de la semaine
    const availabilities = await db.providerAvailability.findMany({
      where: {
        providerId: provider.id,
        isActive: true
      },
      orderBy: { dayOfWeek: 'asc' }
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
        
        documents: provider.user.documents.map(doc => ({
          id: doc.id,
          type: doc.type,
          validationStatus: doc.validationStatus,
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
        pendingRequests: bookings.filter(r => r.status === 'PENDING').length,
        assignedRequests: bookings.filter(r => ['CONFIRMED', 'IN_PROGRESS'].includes(r.status)).length
      },
      
      recentBookings: bookings.map(booking => ({
        id: booking.id,
        status: booking.status,
        scheduledDate: booking.scheduledDate.toISOString(),
        scheduledTime: booking.scheduledTime,
        duration: booking.duration,
        totalPrice: Number(booking.totalPrice),
        notes: booking.notes,
        createdAt: booking.createdAt.toISOString(),
        
        client: {
          id: booking.client.id,
          name: booking.client.user.profile 
            ? `${booking.client.user.profile.firstName || ''} ${booking.client.user.profile.lastName || ''}`.trim()
            : booking.client.user.email
        },
        
        service: {
          id: booking.service.id,
          name: booking.service.name,
          type: booking.service.serviceType
        }
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
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
        isActive: avail.isActive
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