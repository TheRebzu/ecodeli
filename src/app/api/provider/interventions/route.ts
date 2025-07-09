import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/provider/interventions] Interventions du prestataire')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'PROVIDER') {
      console.log('❌ Utilisateur non authentifié ou non prestataire')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Prestataire authentifié:', user.id, user.role)

    // Récupérer le profil prestataire
    const provider = await db.provider.findUnique({
      where: { userId: user.id }
    })

    if (!provider) {
      console.log('❌ Profil prestataire non trouvé')
      return NextResponse.json({ error: 'Profil prestataire non trouvé' }, { status: 404 })
    }

    console.log('✅ Profil prestataire trouvé:', provider.id)

    // Récupérer les paramètres de pagination et de filtre
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || undefined
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    const sortBy = searchParams.get('sortBy') || 'scheduledDate'

    const where: any = { providerId: provider.id }
    if (status) where.status = status

    // Récupérer les interventions existantes
    const [interventions, total] = await Promise.all([
      db.serviceIntervention.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  address: true,
                  city: true
                }
              }
            }
          },
          serviceRequest: {
            select: {
              id: true,
              title: true,
              description: true,
              basePrice: true,
              status: true,
              pickupAddress: true,
              deliveryAddress: true
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true
            }
          }
        },
        orderBy: {
          scheduledDate: sortOrder
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.serviceIntervention.count({ where })
    ])

    console.log(`✅ Interventions trouvées: ${interventions.length} sur un total de ${total}`)

    // Transformer les interventions existantes
    const transformedInterventions = interventions.map(intervention => ({
      id: intervention.id,
      providerId: intervention.providerId,
      clientId: intervention.clientId,
      serviceRequestId: intervention.serviceRequestId,
      title: intervention.title,
      description: intervention.description,
      scheduledDate: intervention.scheduledDate?.toISOString() || intervention.createdAt.toISOString(),
      estimatedDuration: intervention.estimatedDuration,
      actualDuration: intervention.actualDuration,
      status: intervention.status,
      notes: intervention.notes,
      rating: intervention.rating,
      review: intervention.review,
      createdAt: intervention.createdAt.toISOString(),
      updatedAt: intervention.updatedAt.toISOString(),
      type: 'intervention',
      client: {
        id: intervention.client.id,
        profile: {
          firstName: intervention.client.profile?.firstName || '',
          lastName: intervention.client.profile?.lastName || '',
          phone: intervention.client.profile?.phone,
          address: intervention.client.profile?.address,
          city: intervention.client.profile?.city
        }
      },
      serviceRequest: {
        id: intervention.serviceRequest.id,
        title: intervention.serviceRequest.title,
        description: intervention.serviceRequest.description,
        basePrice: intervention.serviceRequest.basePrice,
        status: intervention.serviceRequest.status,
        pickupAddress: intervention.serviceRequest.pickupAddress,
        deliveryAddress: intervention.serviceRequest.deliveryAddress
      },
      payment: intervention.payment ? {
        id: intervention.payment.id,
        amount: intervention.payment.amount,
        currency: intervention.payment.currency,
        status: intervention.payment.status
      } : null
    }))

    // Récupérer les candidatures acceptées qui n'ont pas encore d'intervention
    const acceptedApplications = await db.serviceApplication.findMany({
      where: {
        providerId: provider.id,
        status: 'ACCEPTED'
      },
      include: {
        serviceRequest: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Candidatures acceptées trouvées: ${acceptedApplications.length}`)

    // Transformer les candidatures acceptées en format intervention
    const transformedApplications = acceptedApplications.map(app => ({
      id: `app_${app.id}`, // Préfixe pour distinguer des interventions
      providerId: app.providerId,
      clientId: app.serviceRequest.authorId,
      serviceRequestId: app.serviceRequestId,
      title: app.serviceRequest.title,
      description: app.serviceRequest.description,
      scheduledDate: new Date().toISOString(), // Date actuelle car pas encore planifiée
      estimatedDuration: app.estimatedDuration,
      actualDuration: null,
      status: 'ACCEPTED_PENDING_PAYMENT', // Statut spécial pour candidatures acceptées
      notes: app.message,
      rating: null,
      review: null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      type: 'application',
      client: {
        id: app.serviceRequest.authorId,
        profile: {
          firstName: app.serviceRequest.author.profile?.firstName || '',
          lastName: app.serviceRequest.author.profile?.lastName || '',
          phone: app.serviceRequest.author.profile?.phone,
          address: app.serviceRequest.author.profile?.address,
          city: app.serviceRequest.author.profile?.city
        }
      },
      serviceRequest: {
        id: app.serviceRequest.id,
        title: app.serviceRequest.title,
        description: app.serviceRequest.description,
        basePrice: app.proposedPrice, // Utiliser le prix proposé
        status: app.serviceRequest.status,
        pickupAddress: app.serviceRequest.pickupAddress || '',
        deliveryAddress: app.serviceRequest.deliveryAddress || ''
      },
      payment: null, // Pas encore de paiement
      applicationData: {
        proposedPrice: app.proposedPrice,
        message: app.message,
        applicationId: app.id
      }
    }))

    // Combiner les interventions et les candidatures acceptées
    const allItems = [...transformedInterventions, ...transformedApplications]
    
    // Trier par date de création (plus récent en premier)
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`✅ Total items (interventions + candidatures acceptées): ${allItems.length}`)

    return NextResponse.json({
      interventions: allItems,
      pagination: {
        page: page,
        limit: limit,
        total: total + acceptedApplications.length,
        totalPages: Math.ceil((total + acceptedApplications.length) / limit)
      }
    })
  } catch (error) {
    console.error('❌ Erreur base de données:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}