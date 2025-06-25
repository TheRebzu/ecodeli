import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'
import { NotificationService } from '@/features/notifications/services/notification.service'

// Schéma de validation pour la création/mise à jour de contrat
const contractSchema = z.object({
  type: z.enum(['STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM']),
  terms: z.string().optional(),
  duration: z.number().min(1).max(60).default(12), // en mois
  companyName: z.string().min(2),
  siret: z.string().min(14).max(14),
  vatNumber: z.string().optional(),
  commissionRate: z.number().min(0.05).max(0.30).optional()
})

/**
 * GET - Récupérer le contrat du commerçant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    // Récupérer le profil commerçant avec contrat
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: {
        contract: true,
        cartDropConfig: true,
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 })
    }

    // Calculer les métriques de performance du contrat
    let performanceMetrics = null
    if (merchant.contract) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const deliveriesStats = await prisma.announcement.findMany({
        where: {
          authorId: session.user.id,
          deliveries: {
            some: {
              status: 'DELIVERED',
              completedAt: {
                gte: thirtyDaysAgo
              }
            }
          }
        },
        include: {
          deliveries: {
            where: {
              status: 'DELIVERED',
              completedAt: {
                gte: thirtyDaysAgo
              }
            }
          }
        }
      })

      const totalVolume = deliveriesStats.reduce((sum, announcement) => {
        return sum + announcement.deliveries.length * parseFloat(announcement.price.toString())
      }, 0)

      const totalDeliveries = deliveriesStats.reduce((sum, announcement) => {
        return sum + announcement.deliveries.length
      }, 0)

      performanceMetrics = {
        monthlyVolume: totalVolume,
        monthlyDeliveries: totalDeliveries,
        averageOrderValue: totalDeliveries > 0 ? totalVolume / totalDeliveries : 0,
        commissionGenerated: totalVolume * merchant.commissionRate
      }
    }

    // Types de contrats disponibles avec leurs conditions
    const contractTypes = {
      STANDARD: {
        name: 'Standard',
        description: 'Contrat de base pour les nouveaux commerçants',
        commissionRate: 0.15, // 15%
        monthlyFee: 0,
        minimumVolume: 500, // €/mois
        features: [
          'Gestion des annonces illimitées',
          'Support client standard',
          'Tableau de bord basique',
          'Facturation mensuelle'
        ]
      },
      PREMIUM: {
        name: 'Premium',
        description: 'Contrat avantageux pour les commerçants réguliers',
        commissionRate: 0.12, // 12%
        monthlyFee: 29.99,
        minimumVolume: 1500, // €/mois
        features: [
          'Toutes les fonctionnalités Standard',
          'Commission réduite (12%)',
          'Support client prioritaire',
          'Analytics avancées',
          'Lâcher de chariot inclus',
          'API dédiée'
        ]
      },
      ENTERPRISE: {
        name: 'Entreprise',
        description: 'Contrat pour les grandes entreprises',
        commissionRate: 0.10, // 10%
        monthlyFee: 99.99,
        minimumVolume: 3000, // €/mois
        features: [
          'Toutes les fonctionnalités Premium',
          'Commission encore plus réduite',
          'Account manager dédié',
          'Intégration API complète',
          'SLA garanti'
        ]
      },
      CUSTOM: {
        name: 'Sur mesure',
        description: 'Contrat personnalisé pour les gros volumes',
        commissionRate: 0.08, // 8% (négociable)
        monthlyFee: 199.99,
        minimumVolume: 5000, // €/mois
        features: [
          'Toutes les fonctionnalités Entreprise',
          'Commission négociée',
          'Support dédié 24/7',
          'Intégration sur mesure',
          'Formation équipe'
        ]
      }
    }

    const response = {
      merchant: {
        id: merchant.id,
        companyName: merchant.companyName,
        siret: merchant.siret,
        vatNumber: merchant.vatNumber,
        contractStatus: merchant.contractStatus,
        commissionRate: merchant.commissionRate,
        rating: merchant.rating,
        memberSince: merchant.createdAt
      },
      contract: merchant.contract || null,
      performanceMetrics,
      availableContractTypes: contractTypes,
      cartDropConfig: merchant.cartDropConfig
    }

    return NextResponse.json(response)

  } catch (error) {
    return handleApiError(error, 'fetching merchant contract')
  }
}

/**
 * POST - Créer ou demander un nouveau contrat
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = contractSchema.parse(body)

    // Vérifier si le commerçant existe
    let merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: { contract: true }
    })

    if (!merchant) {
      // Créer le profil commerçant s'il n'existe pas
      merchant = await prisma.merchant.create({
        data: {
          userId: session.user.id,
          companyName: validatedData.companyName,
          siret: validatedData.siret,
          vatNumber: validatedData.vatNumber,
          contractStatus: 'PENDING',
          commissionRate: validatedData.commissionRate || 0.15
        },
        include: { contract: true }
      })
    } else {
      // Mettre à jour les informations du commerçant
      merchant = await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          companyName: validatedData.companyName,
          siret: validatedData.siret,
          vatNumber: validatedData.vatNumber,
          commissionRate: validatedData.commissionRate || merchant.commissionRate
        },
        include: { contract: true }
      })
    }

    // Vérifier s'il y a déjà un contrat actif
    if (merchant.contract && merchant.contract.status === 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Un contrat actif existe déjà. Contactez le support pour le modifier.' 
      }, { status: 409 })
    }

    // Définir les conditions selon le type de contrat
    const contractDefaults = {
      STANDARD: { commissionRate: 0.15 },
      PREMIUM: { commissionRate: 0.12 },
      ENTERPRISE: { commissionRate: 0.10 },
      CUSTOM: { commissionRate: 0.08 }
    }

    const defaults = contractDefaults[validatedData.type]
    
    // Calculer les dates
    const now = new Date()
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + validatedData.duration)

    // Créer le contrat
    const contract = await prisma.contract.create({
      data: {
        merchantId: merchant.id,
        type: validatedData.type,
        status: 'PENDING', // En attente de validation admin
        terms: validatedData.terms || `Contrat ${validatedData.type} EcoDeli`,
        startDate: now,
        endDate: expiresAt
      }
    })

    // Mettre à jour le statut du commerçant
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        contractStatus: 'PENDING',
        commissionRate: validatedData.commissionRate || defaults.commissionRate
      }
    })

    // Notification à l'équipe admin
    await NotificationService.createNotification({
      userId: 'admin', // ID spécial pour les admins
      type: 'CONTRACT_REQUEST',
      title: 'Nouvelle demande de contrat commerçant',
      message: `${merchant.companyName} a demandé un contrat ${validatedData.type}`,
      data: {
        contractId: contract.id,
        merchantId: merchant.id,
        contractType: validatedData.type,
        companyName: merchant.companyName
      },
      sendPush: true,
      priority: 'high'
    })

    // Notification au commerçant
    await NotificationService.createNotification({
      userId: session.user.id,
      type: 'CONTRACT_PENDING',
      title: 'Demande de contrat reçue',
      message: `Votre demande de contrat ${validatedData.type} est en cours de traitement par notre équipe`,
      data: {
        contractId: contract.id
      },
      sendPush: true
    })

    return NextResponse.json({
      contract: {
        id: contract.id,
        type: contract.type,
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate,
        createdAt: contract.createdAt
      },
      merchant: {
        id: merchant.id,
        companyName: merchant.companyName,
        contractStatus: merchant.contractStatus,
        commissionRate: merchant.commissionRate
      },
      message: 'Demande de contrat soumise avec succès. Vous recevrez une notification une fois validée.'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'creating merchant contract')
  }
}

/**
 * PUT - Modifier le contrat existant ou le renouveler
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: { contract: true }
    })

    if (!merchant?.contract) {
      return NextResponse.json({ error: 'Aucun contrat trouvé' }, { status: 404 })
    }

    if (action === 'renew') {
      // Renouvellement du contrat
      const currentEndDate = new Date(merchant.contract.endDate)
      const newEndDate = new Date(currentEndDate)
      newEndDate.setFullYear(newEndDate.getFullYear() + 1) // +1 an

      const updatedContract = await prisma.contract.update({
        where: { id: merchant.contract.id },
        data: {
          endDate: newEndDate,
          status: 'ACTIVE' // Auto-renouvellement
        }
      })

      await NotificationService.createNotification({
        userId: session.user.id,
        type: 'CONTRACT_RENEWED',
        title: 'Contrat renouvelé',
        message: `Votre contrat a été renouvelé jusqu'au ${newEndDate.toLocaleDateString('fr-FR')}`,
        data: {
          contractId: merchant.contract.id,
          newEndDate: newEndDate.toISOString()
        }
      })

      return NextResponse.json({
        contract: updatedContract,
        message: 'Contrat renouvelé avec succès'
      })

    } else if (action === 'cancel') {
      // Demande d'annulation
      await prisma.contract.update({
        where: { id: merchant.contract.id },
        data: {
          status: 'TERMINATED'
        }
      })

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          contractStatus: 'TERMINATED'
        }
      })

      await NotificationService.createNotification({
        userId: session.user.id,
        type: 'CONTRACT_CANCELLED',
        title: 'Contrat résilié',
        message: 'Votre contrat EcoDeli a été résilié',
        data: {
          contractId: merchant.contract.id
        }
      })

      return NextResponse.json({
        message: 'Contrat résilié avec succès'
      })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })

  } catch (error) {
    return handleApiError(error, 'updating merchant contract')
  }
}
