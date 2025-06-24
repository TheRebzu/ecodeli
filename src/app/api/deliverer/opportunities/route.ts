import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// GET - Liste des opportunités de livraison pour le livreur
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') as string | undefined
    const status = searchParams.get('status') as string | undefined
    const maxDistance = searchParams.get('maxDistance') ? parseInt(searchParams.get('maxDistance')!) : undefined

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (deliverer.validationStatus !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Deliverer account not validated. Please complete document validation.' 
      }, { status: 403 })
    }

    // Construire les filtres
    const filters: any = {
      status: status || 'ACTIVE',
      ...(type && { type }),
      scheduledAt: {
        gte: new Date()
      }
    }

    // Exclure les annonces déjà prises par ce livreur
    const delivererAnnouncements = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        status: {
          in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
        }
      },
      select: { announcementId: true }
    })

    if (delivererAnnouncements.length > 0) {
      filters.id = {
        notIn: delivererAnnouncements.map(d => d.announcementId)
      }
    }

    // Récupérer les annonces avec matching potentiel
    const announcements = await prisma.announcement.findMany({
      where: filters,
      include: {
        author: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                rating: true
              }
            }
          }
        },
        deliveries: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          },
          select: {
            id: true,
            status: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const total = await prisma.announcement.count({
      where: filters
    })

    // Calculer la compatibilité avec les routes du livreur
    const delivererRoutes = await prisma.route.findMany({
      where: {
        delivererId: deliverer.id,
        isActive: true,
        departureDate: {
          gte: new Date()
        }
      }
    })

    const opportunitiesWithCompatibility = announcements.map(announcement => {
      // Calculer la compatibilité avec les routes existantes
      const compatibleRoutes = delivererRoutes.filter(route => {
        const routeDeparture = route.startLocation as any
        const routeArrival = route.endLocation as any
        const announcementPickup = announcement.pickupLocation as any
        const announcementDelivery = announcement.deliveryLocation as any

        // Vérification basique de compatibilité géographique
        // TODO: Implémenter calcul de distance réel
        const isDepartureCompatible = routeDeparture.city === announcementPickup.city
        const isArrivalCompatible = routeArrival.city === announcementDelivery.city

        // Vérification de compatibilité temporelle
        const announcementDate = new Date(announcement.scheduledAt)
        const routeDepartureDate = new Date(route.departureDate)
        const routeArrivalDate = new Date(route.arrivalDate)

        const isTimeCompatible = announcementDate >= routeDepartureDate && 
                                announcementDate <= routeArrivalDate

        return (isDepartureCompatible || isArrivalCompatible) && isTimeCompatible
      })

      return {
        ...announcement,
        compatibility: {
          score: compatibleRoutes.length > 0 ? 
            Math.min(compatibleRoutes.length * 25, 100) : 0,
          compatibleRoutes: compatibleRoutes.length,
          reasons: compatibleRoutes.length > 0 ? 
            ['Route compatible trouvée'] : 
            ['Aucune route compatible']
        },
        isAvailable: announcement.deliveries.length === 0
      }
    })

    // Trier par score de compatibilité
    opportunitiesWithCompatibility.sort((a, b) => 
      b.compatibility.score - a.compatibility.score
    )

    return NextResponse.json({
      opportunities: opportunitiesWithCompatibility,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalOpportunities: total,
        highCompatibility: opportunitiesWithCompatibility.filter(o => o.compatibility.score >= 75).length,
        mediumCompatibility: opportunitiesWithCompatibility.filter(o => o.compatibility.score >= 50 && o.compatibility.score < 75).length,
        lowCompatibility: opportunitiesWithCompatibility.filter(o => o.compatibility.score < 50).length
      }
    })
  } catch (error) {
    return handleApiError(error, 'fetching delivery opportunities')
  }
}