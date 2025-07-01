import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('👤 [GET /api/client/deliveries] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'CLIENT') {
      console.log('❌ Rôle incorrect:', user.role)
      return NextResponse.json({ error: 'Forbidden - CLIENT role required' }, { status: 403 })
    }

    console.log('✅ Utilisateur client authentifié:', user.id)

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    console.log('📋 Paramètres de requête:', { page, limit, status })

    // Construire les conditions de filtrage
    const whereConditions: any = {
      announcement: {
        authorId: user.id
      }
    }

    if (status) {
      whereConditions.status = status
    }

    // Récupérer les livraisons
    const deliveries = await db.delivery.findMany({
      where: whereConditions,
      include: {
        announcement: {
          select: {
            title: true,
            pickupAddress: true,
            deliveryAddress: true,
            price: true
          }
        },
        deliverer: {
          include: {
            user: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        ProofOfDelivery: {
          select: {
            photoUrl: true,
            notes: true,
            uploadedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Compter le total pour la pagination
    const total = await db.delivery.count({
      where: whereConditions
    })

    console.log(`✅ ${deliveries.length} livraisons récupérées sur ${total} total`)

    return NextResponse.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('❌ Erreur récupération livraisons client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}