import { NextRequest, NextResponse } from 'next/server'
import { createServiceSchema, searchServicesSchema } from '@/features/services/schemas/service.schema'
import { requireRole } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/client/services] Début de la requête - SERVICES À LA PERSONNE UNIQUEMENT')
    
    const user = await requireRole(request, ['CLIENT'])

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    const { searchParams } = new URL(request.url)
    
    // Validation des paramètres avec le schema
    const params = searchServicesSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      priceMin: searchParams.get('priceMin'),
      priceMax: searchParams.get('priceMax'),
      city: searchParams.get('city'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      urgent: searchParams.get('urgent'),
      requiresCertification: searchParams.get('requiresCertification'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    console.log('📝 Paramètres de recherche services:', params)

    // Construire la clause WHERE pour SERVICES UNIQUEMENT
    const where: any = { 
      client: { userId: user.id } // Services demandés par ce client
    }
    
    if (params.status) where.status = params.status
    if (params.type) where.type = params.type
    if (params.category) where.category = params.category
    if (params.urgent !== undefined) where.isUrgent = params.urgent
    if (params.requiresCertification !== undefined) where.requiresCertification = params.requiresCertification
    
    if (params.city) {
      where.address = { contains: params.city, mode: 'insensitive' }
    }
    
    // Filtres de prix
    if (params.priceMin || params.priceMax) {
      where.basePrice = {}
      if (params.priceMin) where.basePrice.gte = params.priceMin
      if (params.priceMax) where.basePrice.lte = params.priceMax
    }
    
    // Filtres de date
    if (params.dateFrom || params.dateTo) {
      where.scheduledDate = {}
      if (params.dateFrom) where.scheduledDate.gte = new Date(params.dateFrom)
      if (params.dateTo) where.scheduledDate.lte = new Date(params.dateTo)
    }

    // Construire l'ordre de tri
    const orderBy: any = {}
    if (params.sortBy === 'scheduledDate') {
      orderBy.scheduledDate = params.sortOrder
    } else if (params.sortBy === 'basePrice') {
      orderBy.basePrice = params.sortOrder
    } else if (params.sortBy === 'duration') {
      orderBy.estimatedDuration = params.sortOrder
    } else {
      orderBy.createdAt = params.sortOrder
    }

    try {
      console.log('🔍 Requête base de données avec filtres pour services à la personne...')
      
      const [services, total] = await Promise.all([
        db.service.findMany({
          where,
          include: {
            provider: {
              include: {
                user: {
                  include: {
                    profile: {
                      select: { firstName: true, lastName: true, avatar: true }
                    }
                  }
                }
              }
            },
            bookings: {
              where: { clientId: user.id },
              include: {
                client: {
                  include: {
                    profile: {
                      select: { firstName: true, lastName: true, avatar: true }
                    }
                  }
                }
              }
            },
            reviews: {
              where: { clientId: user.id },
              select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true
              }
            }
          },
          orderBy,
          skip: (params.page - 1) * params.limit,
          take: params.limit
        }),
        db.service.count({ where })
      ])

      console.log(`✅ Trouvé ${services.length} services à la personne sur ${total} total`)

      const result = {
        services: services.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          type: service.type,
          category: service.category,
          basePrice: Number(service.basePrice),
          priceUnit: service.priceUnit,
          duration: service.duration,
          isActive: service.isActive,
          averageRating: Number(service.averageRating),
          totalBookings: service.totalBookings,
          isUrgent: service.isUrgent || false,
          requiresCertification: service.requiresCertification || false,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
          
          provider: service.provider ? {
            id: service.provider.id,
            businessName: service.provider.businessName,
            averageRating: Number(service.provider.averageRating),
            totalBookings: service.provider.totalBookings,
            user: {
              id: service.provider.user.id,
              name: service.provider.user.profile 
                ? `${service.provider.user.profile.firstName || ''} ${service.provider.user.profile.lastName || ''}`.trim()
                : service.provider.user.email,
              avatar: service.provider.user.profile?.avatar
            }
          } : null,
          
          bookings: service.bookings.map(booking => ({
            id: booking.id,
            status: booking.status,
            scheduledDate: booking.scheduledDate.toISOString(),
            scheduledTime: booking.scheduledTime,
            totalPrice: Number(booking.totalPrice),
            createdAt: booking.createdAt.toISOString()
          })),
          
          reviews: service.reviews
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
          totalValue: services.reduce((sum, s) => sum + Number(s.basePrice), 0),
          averagePrice: total > 0 ? services.reduce((sum, s) => sum + Number(s.basePrice), 0) / total : 0,
          byStatus: await db.booking.groupBy({
            by: ['status'],
            where: { clientId: user.id },
            _count: { status: true }
          }),
          byType: await db.service.groupBy({
            by: ['type'],
            where: { bookings: { some: { clientId: user.id } } },
            _count: { type: true }
          })
        }
      }

      return NextResponse.json(result)
      
    } catch (dbError: any) {
      console.error('❌ Erreur base de données:', dbError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError?.message || 'Unknown database error'
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('❌ Erreur générale GET services:', error)
    
    // Si c'est une erreur d'authentification, retourner 403
    if (error?.message?.includes('Accès refusé')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/client/services] Demande de service - PRESTATIONS À LA PERSONNE UNIQUEMENT')
    
    const user = await requireRole(request, ['CLIENT'])

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    const body = await request.json()
    console.log('📝 Données reçues:', body)
    
    try {
      const validatedData = createServiceSchema.parse(body)
      console.log('✅ Données de service validées avec succès')
      
      console.log('🔍 Création de la demande de service en base...')
      
      // Préparer les données selon le type de service
      const serviceData: any = {
        name: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        category: validatedData.category,
        basePrice: validatedData.basePrice,
        priceUnit: validatedData.priceUnit,
        duration: validatedData.estimatedDuration,
        minAdvanceBooking: 24, // 24h par défaut
        isActive: true,
        
        // Instructions et notes
        requirements: validatedData.specialRequirements ? [validatedData.specialRequirements] : [],
        cancellationPolicy: validatedData.allowsReschedule ? 'Modification autorisée jusqu\'à 24h avant' : 'Pas de modification possible'
      }

      // Créer d'abord le service
      const service = await db.service.create({
        data: serviceData,
        include: {
          provider: {
            include: {
              user: {
                include: {
                  profile: {
                    select: { firstName: true, lastName: true, avatar: true }
                  }
                }
              }
            }
          }
        }
      })

      // Ensuite créer une réservation pour ce service
      const booking = await db.booking.create({
        data: {
          clientId: user.id,
          serviceId: service.id,
          providerId: service.providerId, // Le prestataire sera assigné plus tard via matching
          status: 'PENDING',
          scheduledDate: new Date(validatedData.scheduledDate),
          scheduledTime: validatedData.startTime,
          duration: validatedData.estimatedDuration,
          address: validatedData.location,
          totalPrice: validatedData.basePrice,
          notes: validatedData.clientNotes
        },
        include: {
          service: true,
          client: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true }
              }
            }
          }
        }
      })

      console.log('✅ Service et réservation créés avec succès:', service.id, booking.id)
      
      const result = {
        service: {
          id: service.id,
          name: service.name,
          description: service.description,
          type: service.type,
          category: service.category,
          basePrice: Number(service.basePrice),
          priceUnit: service.priceUnit,
          duration: service.duration,
          isActive: service.isActive,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString()
        },
        booking: {
          id: booking.id,
          status: booking.status,
          scheduledDate: booking.scheduledDate.toISOString(),
          scheduledTime: booking.scheduledTime,
          duration: booking.duration,
          totalPrice: Number(booking.totalPrice),
          createdAt: booking.createdAt.toISOString(),
          client: {
            id: booking.client.id,
            name: booking.client.profile 
              ? `${booking.client.profile.firstName || ''} ${booking.client.profile.lastName || ''}`.trim()
              : booking.client.email,
            avatar: booking.client.profile?.avatar
          }
        }
      }
      
      return NextResponse.json(result, { status: 201 })
      
    } catch (validationError: any) {
      console.error('❌ Erreur validation/création service:', validationError)
      return NextResponse.json({ 
        error: 'Validation or creation error', 
        details: validationError?.message || 'Validation failed'
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('❌ Erreur générale POST services:', error)
    
    // Si c'est une erreur d'authentification, retourner 403
    if (error?.message?.includes('Accès refusé')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}