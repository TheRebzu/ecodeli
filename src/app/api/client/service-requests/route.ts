import { NextRequest, NextResponse } from 'next/server'
import { createServiceSchema, searchServicesSchema } from '@/features/services/schemas/service.schema'
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
    const params = searchServicesSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      budgetMin: searchParams.get('budgetMin'),
      budgetMax: searchParams.get('budgetMax'),
      city: searchParams.get('city'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      urgency: searchParams.get('urgency'),
      isRecurring: searchParams.get('isRecurring'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    console.log('📝 Paramètres de recherche demandes de services:', params)

    // Construire la clause WHERE
    const where: any = { clientId: user.id }
    
    if (params.status) where.status = params.status
    if (params.type) where.type = params.type
    if (params.urgency) where.urgency = params.urgency
    if (params.isRecurring !== undefined) where.isRecurring = params.isRecurring
    if (params.city) {
      where.address = { contains: params.city, mode: 'insensitive' }
    }
    
    // Filtres de budget
    if (params.budgetMin || params.budgetMax) {
      where.budget = {}
      if (params.budgetMin) where.budget.gte = params.budgetMin
      if (params.budgetMax) where.budget.lte = params.budgetMax
    }
    
    // Filtres de date
    if (params.dateFrom || params.dateTo) {
      where.scheduledAt = {}
      if (params.dateFrom) where.scheduledAt.gte = new Date(params.dateFrom)
      if (params.dateTo) where.scheduledAt.lte = new Date(params.dateTo)
    }

    // Construire l'ordre de tri
    const orderBy: any = {}
    if (params.sortBy === 'scheduledAt') {
      orderBy.scheduledAt = params.sortOrder
    } else if (params.sortBy === 'budget') {
      orderBy.budget = params.sortOrder
    } else if (params.sortBy === 'urgency') {
      orderBy.urgency = params.sortOrder
    } else {
      orderBy.createdAt = params.sortOrder
    }

    try {
      console.log('🔍 Requête base de données demandes de services avec filtres...')
      
      const [serviceRequests, total] = await Promise.all([
        db.serviceRequest.findMany({
          where,
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        avatar: true
                      }
                    }
                  }
                }
              }
            },
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        rating: true
                      }
                    }
                  }
                }
              }
            },
            reviews: {
              select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true
              }
            },
            _count: {
              select: {
                applications: true,
                reviews: true,
                attachments: true
              }
            }
          },
          orderBy,
          skip: (params.page - 1) * params.limit,
          take: params.limit
        }),
        db.serviceRequest.count({ where })
      ])

      console.log(`✅ Trouvé ${serviceRequests.length} demandes de services sur ${total} total`)

      const result = {
        serviceRequests: serviceRequests.map(service => ({
          id: service.id,
          title: service.title,
          description: service.description,
          type: service.type,
          status: service.status,
          budget: Number(service.budget),
          duration: service.duration,
          scheduledAt: service.scheduledAt.toISOString(),
          isRecurring: service.isRecurring,
          frequency: service.frequency,
          urgency: service.urgency,
          address: service.address,
          city: service.city,
          floor: service.floor,
          specificRequirements: service.specificRequirements,
          providerGender: service.providerGender,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
          _count: service._count,
          provider: service.provider ? {
            id: service.provider.user.id,
            name: service.provider.user.profile 
              ? `${service.provider.user.profile.firstName || ''} ${service.provider.user.profile.lastName || ''}`.trim()
              : service.provider.user.name,
            avatar: service.provider.user.profile?.avatar,
            rating: service.provider.user.profile?.rating
          } : null,
          client: {
            id: service.client.user.id,
            name: service.client.user.profile 
              ? `${service.client.user.profile.firstName || ''} ${service.client.user.profile.lastName || ''}`.trim()
              : service.client.user.name,
            avatar: service.client.user.profile?.avatar
          },
          // Détails spécifiques parsés
          cleaningDetails: service.cleaningDetails ? JSON.parse(service.cleaningDetails) : null,
          gardeningDetails: service.gardeningDetails ? JSON.parse(service.gardeningDetails) : null,
          petCareDetails: service.petCareDetails ? JSON.parse(service.petCareDetails) : null,
          handymanDetails: service.handymanDetails ? JSON.parse(service.handymanDetails) : null
        })),
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit),
          hasNext: params.page < Math.ceil(total / params.limit),
          hasPrev: params.page > 1
        },
        stats: {
          totalBudget: serviceRequests.reduce((sum, s) => sum + Number(s.budget), 0),
          averageBudget: total > 0 ? serviceRequests.reduce((sum, s) => sum + Number(s.budget), 0) / total : 0,
          byStatus: await db.serviceRequest.groupBy({
            by: ['status'],
            where: { clientId: user.id },
            _count: { status: true }
          }),
          byType: await db.serviceRequest.groupBy({
            by: ['type'],
            where: { clientId: user.id },
            _count: { type: true }
          })
        }
      }

      return NextResponse.json(result)
      
    } catch (dbError) {
      console.error('❌ Erreur base de données demandes de services:', dbError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Erreur générale GET demandes de services:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/client/service-requests] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    // Vérifier que c'est bien un client
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - CLIENT role required' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Données reçues demande de service:', body)
    
    try {
      const validatedData = createServiceSchema.parse(body)
      console.log('✅ Données demande de service validées avec succès')
      
      console.log('🔍 Création de la demande de service en base...')
      
      const serviceRequest = await db.serviceRequest.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          type: validatedData.type,
          clientId: user.id,
          address: validatedData.location.address,
          city: validatedData.location.city,
          postalCode: validatedData.location.postalCode,
          floor: validatedData.location.floor,
          accessCode: validatedData.location.accessCode,
          scheduledAt: new Date(validatedData.scheduledAt),
          duration: validatedData.duration,
          budget: validatedData.budget,
          isRecurring: validatedData.isRecurring,
          frequency: validatedData.frequency,
          specificRequirements: validatedData.specificRequirements,
          providerGender: validatedData.providerGender,
          urgency: validatedData.urgency,
          status: 'ACTIVE',
          // Détails spécifiques selon le type
          cleaningDetails: validatedData.cleaningDetails ? JSON.stringify(validatedData.cleaningDetails) : null,
          gardeningDetails: validatedData.gardeningDetails ? JSON.stringify(validatedData.gardeningDetails) : null,
          petCareDetails: validatedData.petCareDetails ? JSON.stringify(validatedData.petCareDetails) : null,
          handymanDetails: validatedData.handymanDetails ? JSON.stringify(validatedData.handymanDetails) : null
        },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      console.log('✅ Demande de service créée avec succès:', serviceRequest.id)
      
      const result = {
        serviceRequest: {
          id: serviceRequest.id,
          title: serviceRequest.title,
          description: serviceRequest.description,
          type: serviceRequest.type,
          status: serviceRequest.status,
          budget: Number(serviceRequest.budget),
          duration: serviceRequest.duration,
          scheduledAt: serviceRequest.scheduledAt.toISOString(),
          address: serviceRequest.address,
          city: serviceRequest.city,
          isRecurring: serviceRequest.isRecurring,
          urgency: serviceRequest.urgency,
          createdAt: serviceRequest.createdAt.toISOString(),
          updatedAt: serviceRequest.updatedAt.toISOString(),
          client: {
            id: serviceRequest.client.user.id,
            name: serviceRequest.client.user.profile 
              ? `${serviceRequest.client.user.profile.firstName || ''} ${serviceRequest.client.user.profile.lastName || ''}`.trim()
              : serviceRequest.client.user.name,
            avatar: serviceRequest.client.user.profile?.avatar
          }
        }
      }
      
      return NextResponse.json(result, { status: 201 })
      
    } catch (validationError) {
      console.error('❌ Erreur validation/création demande de service:', validationError)
      return NextResponse.json({ 
        error: 'Validation or creation error', 
        details: validationError.message 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Erreur générale POST demandes de services:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}