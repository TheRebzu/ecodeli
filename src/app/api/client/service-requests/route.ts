import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { createServiceRequestSchema } from '@/features/services/schemas/service-request.schema'
import { z } from 'zod'

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

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/client/service-requests] Création demande de service')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    const body = await request.json()
    console.log('📝 Données reçues:', body)

    // Validation des données avec le schéma
    let validatedData
    try {
      validatedData = createServiceRequestSchema.parse(body)
      console.log('✅ Données validées:', validatedData)
    } catch (validationError) {
      console.error('❌ Erreur de validation:', validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Données invalides',
          details: validationError.errors
        }, { status: 400 })
      }
      return NextResponse.json({
        error: 'Format de données invalide'
      }, { status: 400 })
    }

    // Préparation des instructions spéciales avec les informations d'accès
    let specialInstructions = validatedData.specificRequirements || ''
    if (validatedData.location.accessCode) {
      specialInstructions += `\nCode d'accès: ${validatedData.location.accessCode}`
    }
    if (validatedData.location.floor) {
      specialInstructions += `\nÉtage: ${validatedData.location.floor}`
    }

    // Création de l'annonce principale
    const announcement = await db.announcement.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: 'HOME_SERVICE',
        status: 'ACTIVE',
        basePrice: validatedData.budget,
        currency: 'EUR',
        pickupAddress: `${validatedData.location.address}, ${validatedData.location.postalCode} ${validatedData.location.city}`,
        deliveryAddress: `${validatedData.location.address}, ${validatedData.location.postalCode} ${validatedData.location.city}`,
        pickupDate: new Date(validatedData.scheduledAt),
        deliveryDate: new Date(validatedData.scheduledAt),
        pickupLatitude: 0, // À géocoder
        pickupLongitude: 0, // À géocoder
        deliveryLatitude: 0, // À géocoder
        deliveryLongitude: 0, // À géocoder
        isUrgent: validatedData.urgency === 'HIGH' || validatedData.urgency === 'URGENT',
        authorId: user.id,
        specialInstructions: specialInstructions.trim(),
        estimatedDuration: validatedData.duration,
        publishedAt: new Date()
      }
    })

    console.log('✅ Annonce créée:', announcement.id)

    // Création des détails de service
    const serviceAnnouncement = await db.serviceAnnouncement.create({
      data: {
        announcementId: announcement.id,
        serviceType: validatedData.type as any, // Conversion du type
        duration: validatedData.duration,
        recurringService: validatedData.isRecurring,
        recurringPattern: validatedData.frequency || null,
        specialRequirements: validatedData.specificRequirements || null,
        preferredProviderId: null // À implémenter si nécessaire
      }
    })

    console.log('✅ Détails de service créés:', serviceAnnouncement.id)

    // Création du tracking initial
    await db.announcementTracking.create({
      data: {
        announcementId: announcement.id,
        status: 'ACTIVE',
        message: 'Demande de service créée',
        createdBy: user.id,
        isPublic: true
      }
    })

    console.log('✅ Tracking initial créé')

    // Récupération de l'annonce complète avec relations
    const createdAnnouncement = await db.announcement.findUnique({
      where: { id: announcement.id },
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
        ServiceAnnouncement: true,
        tracking: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    console.log('✅ Demande de service créée avec succès')

    return NextResponse.json({
      message: 'Demande de service créée avec succès',
      serviceRequest: createdAnnouncement
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error)
    return NextResponse.json({
      error: 'Erreur lors de la création de la demande de service'
    }, { status: 500 })
  }
}