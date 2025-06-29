import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema pour filtres d'opportunités
const opportunitiesFiltersSchema = z.object({
  page: z.string().nullable().transform(val => val ? parseInt(val) : 1).pipe(z.number().min(1)),
  limit: z.string().nullable().transform(val => val ? parseInt(val) : 20).pipe(z.number().min(1).max(50)),
  maxDistance: z.string().nullable().transform(val => val ? parseInt(val) : 50).pipe(z.number().min(1).max(100)),
  minPrice: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().min(0).optional()),
  maxPrice: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().min(0).optional()),
  type: z.string().nullable().optional(),
  urgentOnly: z.string().nullable().transform(val => val === 'true').pipe(z.boolean()),
  sortBy: z.string().nullable().transform(val => val || 'createdAt').pipe(z.enum(['distance', 'price', 'createdAt'])),
  sortOrder: z.string().nullable().transform(val => val || 'desc').pipe(z.enum(['asc', 'desc']))
})

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/deliverer/opportunities] Début de la requête')
    
    const user = await requireRole(request, ['DELIVERER'])

    console.log('✅ Livreur authentifié:', user.id)

    const { searchParams } = new URL(request.url)
    
    // Validation des paramètres
    const params = opportunitiesFiltersSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      maxDistance: searchParams.get('maxDistance'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      type: searchParams.get('type'),
      urgentOnly: searchParams.get('urgentOnly'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    console.log('📝 Paramètres opportunités:', params)

    // Récupérer le profil du livreur avec sa localisation
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                city: true,
                address: true
              }
            }
          }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur non trouvé' }, { status: 404 })
    }

    // Construire la clause WHERE pour les annonces disponibles
    const where: any = {
      status: 'ACTIVE',
      // Exclure les annonces déjà candidatées ou assignées
      NOT: {
        OR: [
          { matches: { some: { delivererId: user.id } } },
          { deliveries: { some: { delivererId: user.id } } }
        ]
      }
    }

    if (params.type) where.type = params.type
    if (params.urgentOnly) where.isUrgent = true
    if (params.minPrice || params.maxPrice) {
      where.basePrice = {}
      if (params.minPrice) where.basePrice.gte = params.minPrice
      if (params.maxPrice) where.basePrice.lte = params.maxPrice
    }

    // Récupérer les annonces disponibles
    const announcements = await db.announcement.findMany({
      where,
      include: {
        author: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
                rating: true
              }
            }
          }
        },
        packageAnnouncement: {
          select: {
            weight: true,
            length: true,
            width: true,
            height: true,
            fragile: true,
            insuredValue: true
          }
        },
        _count: {
          select: {
            matches: true,
            views: true
          }
        }
      },
      orderBy: params.sortBy === 'createdAt' ? { createdAt: params.sortOrder } :
               params.sortBy === 'price' ? { basePrice: params.sortOrder } :
               { createdAt: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    })

    // Calculer la distance pour chaque annonce (simulation)
    // Utiliser des coordonnées par défaut basées sur la ville
    const delivererLat = 48.8566 // Paris par défaut (à implémenter: géocodage de l'adresse)
    const delivererLng = 2.3522

    const opportunitiesWithDistance = announcements.map(announcement => {
      // Calcul de distance simplifié (haversine)
      const distance = calculateDistance(
        delivererLat,
        delivererLng,
        announcement.pickupLatitude || 48.8566,
        announcement.pickupLongitude || 2.3522
      )

      return {
        id: announcement.id,
        title: announcement.title,
        description: announcement.description,
        type: announcement.type,
        status: announcement.status,
        basePrice: Number(announcement.basePrice),
        finalPrice: Number(announcement.finalPrice || announcement.basePrice),
        currency: announcement.currency,
        isUrgent: announcement.isUrgent,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        pickupDate: announcement.pickupDate?.toISOString(),
        deliveryDate: announcement.deliveryDate?.toISOString(),
        createdAt: announcement.createdAt.toISOString(),
        distance: Math.round(distance * 10) / 10, // Arrondi à 0.1 km
        estimatedDuration: Math.ceil(distance * 2 + 30), // Estimation en minutes
        packageDetails: announcement.packageAnnouncement,
        _count: announcement._count,
        client: {
          id: announcement.author.id,
          name: announcement.author.profile 
            ? `${announcement.author.profile.firstName || ''} ${announcement.author.profile.lastName || ''}`.trim()
            : announcement.author.email,
          avatar: announcement.author.profile?.avatar,
          rating: announcement.author.profile?.rating
        }
      }
    })

    // Filtrer par distance si spécifié
    const filteredOpportunities = opportunitiesWithDistance.filter(
      opp => opp.distance <= params.maxDistance
    )

    // Trier par distance si demandé
    if (params.sortBy === 'distance') {
      filteredOpportunities.sort((a, b) => 
        params.sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance
      )
    }

    const total = await db.announcement.count({ where })

    console.log(`✅ Trouvé ${filteredOpportunities.length} opportunités sur ${total} total`)

    const result = {
      opportunities: filteredOpportunities,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: filteredOpportunities.length,
        totalPages: Math.ceil(filteredOpportunities.length / params.limit),
        hasNext: params.page < Math.ceil(filteredOpportunities.length / params.limit),
        hasPrev: params.page > 1
      },
      delivererInfo: {
        id: deliverer.id,
        location: {
          city: deliverer.user.profile?.city,
          lat: delivererLat,
          lng: delivererLng
        },
        searchRadius: params.maxDistance
      },
      stats: {
        totalOpportunities: filteredOpportunities.length,
        urgentCount: filteredOpportunities.filter(o => o.isUrgent).length,
        averagePrice: filteredOpportunities.length > 0 
          ? filteredOpportunities.reduce((sum, o) => sum + o.basePrice, 0) / filteredOpportunities.length 
          : 0,
        averageDistance: filteredOpportunities.length > 0
          ? filteredOpportunities.reduce((sum, o) => sum + o.distance, 0) / filteredOpportunities.length
          : 0
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erreur récupération opportunités:', error)
    
    // Si c'est une erreur d'authentification, retourner 403
    if (error.message?.includes('Accès refusé')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Fonction de calcul de distance (formule haversine simplifiée)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}