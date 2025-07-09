import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/client/service-requests] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    const { searchParams } = new URL(request.url)
    
    // Validation des paramètres avec le schema
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

    // Construction des filtres
    const where: any = {
      authorId: user.id,
      type: 'HOME_SERVICE'
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
                    avatar: true
                  }
                }
              }
            },
            deliverer: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true
                  }
                }
              }
            },
            ServiceAnnouncement: true,
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

      return NextResponse.json({
        serviceRequests,
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