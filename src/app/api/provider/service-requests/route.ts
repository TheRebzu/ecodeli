import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/provider/service-requests] Début de la requête - DEMANDES DE SERVICES POUR PRESTATAIRES')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'PROVIDER') {
      console.log('❌ Utilisateur non authentifié ou non prestataire')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Prestataire authentifié:', user.id, user.role)

    // Récupérer le profil prestataire avec ses spécialités
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
      include: {
        services: {
          where: { isActive: true }
        }
      }
    })

    if (!provider) {
      console.log('❌ Profil prestataire non trouvé')
      return NextResponse.json({ error: 'Profil prestataire non trouvé' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    
    // Validation des paramètres
    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      budgetMin: searchParams.get('budgetMin'),
      budgetMax: searchParams.get('budgetMax'),
      city: searchParams.get('city'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      urgency: searchParams.get('urgency'),
      isRecurring: searchParams.get('isRecurring'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    }

    console.log('📝 Paramètres de recherche demandes de services:', params)

    // Construction des filtres - demandes de services actives des clients
    const where: any = {
      type: 'HOME_SERVICE',
      status: 'ACTIVE' // Seulement les demandes actives
    }

    // Filtres optionnels
    if (params.status) {
      where.status = params.status
    }

    if (params.budgetMin || params.budgetMax) {
      where.basePrice = {}
      if (params.budgetMin) where.basePrice.gte = parseFloat(params.budgetMin)
      if (params.budgetMax) where.basePrice.lte = parseFloat(params.budgetMax)
    }

    if (params.urgency) {
      where.isUrgent = params.urgency === 'true'
    }

    if (params.city) {
      where.location = {
        path: ['city'],
        contains: params.city
      }
    }

    // Filtrer par types de services que le prestataire propose
    const providerServiceTypes = provider.services.map(s => s.type)
    if (providerServiceTypes.length > 0) {
      // Utiliser array_contains au lieu de in pour les champs JSON
      where.OR = providerServiceTypes.map(serviceType => ({
        serviceDetails: {
          path: ['serviceType'],
          equals: serviceType
        }
      }))
    }

    console.log('🔍 Requête base de données demandes de services avec filtres...')

    try {
      const [serviceRequests, total] = await Promise.all([
        db.announcement.findMany({
          where,
          include: {
            author: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    city: true
                  }
                }
              }
            },
            _count: {
              select: {
                reviews: true,
                matches: true,
                attachments: true,
                notifications: true,
                tracking: true,
                AnnouncementGroup: true,
                GroupingProposal: true
              }
            }
          },
          orderBy: {
            [params.sortBy]: params.sortOrder
          },
          skip: (params.page - 1) * params.limit,
          take: params.limit
        }),
        db.announcement.count({ where })
      ])

      console.log(`✅ Demandes de services trouvées: ${serviceRequests.length} sur un total de ${total}`)

      // Transformer les données pour correspondre à l'interface frontend
      const transformedRequests = serviceRequests.map(request => ({
        id: request.id,
        title: request.title,
        description: request.description,
        serviceType: request.serviceDetails?.serviceType || 'HOME_SERVICE',
        status: request.status,
        budget: request.basePrice,
        estimatedDuration: request.serviceDetails?.estimatedDuration || 60,
        scheduledAt: request.scheduledAt?.toISOString() || new Date().toISOString(),
        isRecurring: request.serviceDetails?.isRecurring || false,
        frequency: request.serviceDetails?.frequency,
        urgency: request.isUrgent ? 'URGENT' : 'NORMAL',
        location: request.location ? {
          address: request.location.address || '',
          city: request.location.city || '',
          postalCode: request.location.postalCode || '',
          latitude: request.location.latitude,
          longitude: request.location.longitude
        } : undefined,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        clientId: request.authorId,
        client: {
          id: request.author.id,
          profile: {
            firstName: request.author.profile?.firstName || '',
            lastName: request.author.profile?.lastName || '',
            avatar: request.author.profile?.avatar
          }
        },
        _count: request._count
      }))

      return NextResponse.json({
        serviceRequests: transformedRequests,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit)
        }
      })

    } catch (dbError) {
      console.error('❌ Erreur base de données:', dbError)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des demandes de services' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 