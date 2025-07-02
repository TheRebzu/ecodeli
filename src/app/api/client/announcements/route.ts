import { NextRequest, NextResponse } from 'next/server'
import { createAnnouncementSchema, searchAnnouncementsSchema } from '@/features/announcements/schemas/announcement.schema'
import { requireRole } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/client/announcements] Début de la requête')
    
    const user = await requireRole(request, ['CLIENT'])

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    const { searchParams } = new URL(request.url)
    
    // Validation des paramètres avec le schema
    const params = searchAnnouncementsSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      priceMin: searchParams.get('priceMin'),
      priceMax: searchParams.get('priceMax'),
      city: searchParams.get('city'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      urgent: searchParams.get('urgent'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    console.log('📝 Paramètres de recherche:', params)

    // Construire la clause WHERE
    const where: any = { authorId: user.id }
    
    if ((await params).status) where.status = (await params).status
    if ((await params).type) where.type = (await params).type
    if ((await params).urgent !== undefined) where.isUrgent = (await params).urgent
    if ((await params).city) {
      where.OR = [
        { pickupAddress: { contains: (await params).city, mode: 'insensitive' } },
        { deliveryAddress: { contains: (await params).city, mode: 'insensitive' } }
      ]
    }
    
    // Filtres de prix
    if ((await params).priceMin || (await params).priceMax) {
      where.basePrice = {}
      if ((await params).priceMin) where.basePrice.gte = (await params).priceMin
      if ((await params).priceMax) where.basePrice.lte = (await params).priceMax
    }
    
    // Filtres de date
    if ((await params).dateFrom || (await params).dateTo) {
      where.pickupDate = {}
      if ((await params).dateFrom) where.pickupDate.gte = new Date((await params).dateFrom)
      if ((await params).dateTo) where.pickupDate.lte = new Date((await params).dateTo)
    }

    // Construire l'ordre de tri
    const orderBy: any = {}
    if ((await params).sortBy === 'desiredDate') {
      orderBy.pickupDate = (await params).sortOrder
    } else if ((await params).sortBy === 'price') {
      orderBy.basePrice = (await params).sortOrder
    } else {
      orderBy.createdAt = (await params).sortOrder
    }

    try {
      console.log('🔍 Requête base de données avec filtres avancés...')
      
      const [announcements, total] = await Promise.all([
        db.announcement.findMany({
          where,
          include: {
            author: {
              include: {
                profile: {
                  select: { firstName: true, lastName: true, avatar: true }
                }
              }
            },
            attachments: {
              select: {
                id: true,
                url: true,
                filename: true,
                mimeType: true,
                size: true
              }
            },
            PackageAnnouncement: {
              select: {
                weight: true,
                length: true,
                width: true,
                height: true,
                fragile: true,
                insuredValue: true
              }
            },
            delivery: {
              select: {
                id: true,
                status: true,
                deliverer: {
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
            _count: {
              select: {
                matches: true,
                reviews: true,
                attachments: true,
                tracking: true
              }
            }
          },
          orderBy,
          skip: ((await params).page - 1) * (await params).limit,
          take: (await params).limit
        }),
        db.announcement.count({ where })
      ])

      console.log(`✅ Trouvé ${announcements.length} annonces sur ${total} total`)

      const result = {
        announcements: announcements.map(announcement => ({
          id: announcement.id,
          title: announcement.title,
          description: announcement.description,
          type: announcement.type,
          status: announcement.status,
          basePrice: Number(announcement.basePrice),
          finalPrice: Number(announcement.finalPrice || announcement.basePrice),
          currency: announcement.currency,
          pickupAddress: announcement.pickupAddress,
          deliveryAddress: announcement.deliveryAddress,
          startLocation: {
            address: announcement.pickupAddress,
            city: announcement.pickupAddress.split(',').pop()?.trim() || 'Paris'
          },
          endLocation: {
            address: announcement.deliveryAddress,
            city: announcement.deliveryAddress.split(',').pop()?.trim() || 'Lyon'
          },
          pickupDate: announcement.pickupDate?.toISOString(),
          deliveryDate: announcement.deliveryDate?.toISOString(),
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
          isUrgent: announcement.isUrgent,
          viewCount: announcement.viewCount,
          packageDetails: announcement.packageAnnouncement,
          _count: announcement._count,
          delivery: announcement.delivery || null,
          author: {
            id: announcement.author.id,
            name: announcement.author.profile 
              ? `${announcement.author.profile.firstName || ''} ${announcement.author.profile.lastName || ''}`.trim()
              : announcement.author.email,
            avatar: announcement.author.profile?.avatar
          }
        })),
        pagination: {
          page: (await params).page,
          limit: (await params).limit,
          total,
          totalPages: Math.ceil(total / (await params).limit),
          hasNext: (await params).page < Math.ceil(total / (await params).limit),
          hasPrev: (await params).page > 1
        },
        stats: {
          totalValue: announcements.reduce((sum, a) => sum + Number(a.basePrice), 0),
          averagePrice: total > 0 ? announcements.reduce((sum, a) => sum + Number(a.basePrice), 0) / total : 0,
          byStatus: await db.announcement.groupBy({
            by: ['status'],
            where: { authorId: user.id },
            _count: { status: true }
          }),
          byType: await db.announcement.groupBy({
            by: ['type'],
            where: { authorId: user.id },
            _count: { type: true }
          })
        }
      }

      return NextResponse.json(result)
      
    } catch (dbError) {
      console.error('❌ Erreur base de données:', dbError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Erreur générale GET announcements:', error)
    
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

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/client/announcements] Début de la requête')
    
    const user = await requireRole(request, ['CLIENT'])

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    const body = await request.json()
    console.log('📝 Données reçues:', body)
    
    try {
      const validatedData = createAnnouncementSchema.parse(body)
      console.log('✅ Données validées avec succès')
      
      console.log('🔍 Création de l\'annonce en base...')
      
      const announcement = await db.announcement.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          type: validatedData.type,
          basePrice: validatedData.price,
          currency: validatedData.currency,
          authorId: user.id,
          pickupAddress: validatedData.pickupAddress || validatedData.startLocation?.address || '',
          deliveryAddress: validatedData.deliveryAddress || validatedData.endLocation?.address || '',
          pickupDate: validatedData.desiredDate ? new Date(validatedData.desiredDate) : null,
          status: 'ACTIVE',
          packageDetails: validatedData.type === 'PACKAGE_DELIVERY' ? validatedData.packageDetails : null,
          isUrgent: validatedData.urgent || false
        },
        include: {
          author: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true }
              }
            }
          },
          attachments: {
            select: {
              id: true,
              url: true,
              filename: true,
              mimeType: true,
              size: true
            }
          }
        }
      })

      console.log('✅ Annonce créée avec succès:', announcement.id)
      
      const result = {
        announcement: {
          id: announcement.id,
          title: announcement.title,
          description: announcement.description,
          type: announcement.type,
          status: announcement.status,
          price: Number(announcement.basePrice),
          currency: announcement.currency,
          startLocation: {
            address: announcement.pickupAddress,
            city: announcement.pickupAddress.split(',').pop()?.trim() || 'Paris'
          },
          endLocation: {
            address: announcement.deliveryAddress,
            city: announcement.deliveryAddress.split(',').pop()?.trim() || 'Lyon'
          },
          scheduledAt: announcement.pickupDate?.toISOString(),
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
          author: {
            id: announcement.author.id,
            name: announcement.author.profile 
              ? `${announcement.author.profile.firstName || ''} ${announcement.author.profile.lastName || ''}`.trim()
              : announcement.author.email,
            avatar: announcement.author.profile?.avatar
          }
        }
      }
      
      return NextResponse.json(result, { status: 201 })
      
    } catch (validationError) {
      console.error('❌ Erreur validation/création:', validationError)
      return NextResponse.json({ 
        error: 'Validation or creation error', 
        details: validationError.message 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Erreur générale POST announcements:', error)
    
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