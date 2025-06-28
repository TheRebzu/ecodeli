import { NextRequest, NextResponse } from 'next/server'
import { createAnnouncementSchema } from '@/features/announcements/schemas/announcement.schema'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/client/announcements] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    console.log('📝 Paramètres de recherche:', { page, limit, status, type })

    // Construire la clause WHERE
    const where: any = { authorId: user.id }
    if (status) where.status = status
    if (type) where.type = type

    try {
      console.log('🔍 Requête base de données simplifiée...')
      
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
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
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
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
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
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/client/announcements] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    // Vérifier que c'est bien un client (sans relation subscription pour l'instant)
    if (user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden - CLIENT role required' }, { status: 403 })
    }

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
          pickupAddress: validatedData.startLocation.address,
          deliveryAddress: validatedData.endLocation.address,
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
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}