import { NextRequest, NextResponse } from 'next/server'
import { auth, authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createContractSchema = z.object({
  type: z.enum(['STANDARD', 'PREMIUM', 'CUSTOM']),
  requestedCommissionRate: z.number().min(0).max(20).optional(),
  expectedVolume: z.number().min(0).optional(),
  specialRequirements: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium')
})

// GET /api/merchant/contracts-advanced - Récupérer les contrats du commerçant
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'

    const whereClause: any = {
      merchantId: session.user.id
    }

    if (!includeHistory) {
      whereClause.status = {
        not: 'terminated'
      }
    }

    const contracts = await prisma.merchantContract.findMany({
      where: whereClause,
      include: {
        assignedAgent: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
                phone: true
              }
            }
          }
        },
        negotiations: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            requester: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      contracts: contracts.map(contract => ({
        id: contract.id,
        contractNumber: contract.contractNumber,
        type: contract.type,
        status: contract.status,
        title: contract.title,
        description: contract.description,
        commissionRate: contract.commissionRate,
        paymentTerms: contract.paymentTerms,
        minimumVolume: contract.minimumVolume,
        bonusThresholds: contract.bonusThresholds ? 
          JSON.parse(contract.bonusThresholds as string) : null,
        startDate: contract.startDate?.toISOString(),
        endDate: contract.endDate?.toISOString(),
        autoRenewal: contract.autoRenewal,
        signedAt: contract.signedAt?.toISOString(),
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
        assignedAgent: contract.assignedAgent ? {
          name: `${contract.assignedAgent.profile?.firstName || ''} ${contract.assignedAgent.profile?.lastName || ''}`.trim(),
          email: contract.assignedAgent.profile?.email,
          phone: contract.assignedAgent.profile?.phone,
          avatar: contract.assignedAgent.profile?.avatar
        } : null,
        negotiations: contract.negotiations.map(neg => ({
          id: neg.id,
          proposedRate: neg.proposedCommissionRate,
          reason: neg.reason,
          status: neg.status,
          createdAt: neg.createdAt.toISOString(),
          response: neg.response,
          counterOffer: neg.counterOfferRate
        })),
        documents: contract.documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          url: doc.url,
          signatureRequired: doc.signatureRequired,
          signed: doc.signed,
          signedAt: doc.signedAt?.toISOString()
        }))
      }))
    })

  } catch (error) {
    console.error('Erreur récupération contrats:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST /api/merchant/contracts-advanced - Demander un nouveau contrat
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createContractSchema.parse(body)

    // Générer un numéro de contrat unique
    const currentYear = new Date().getFullYear()
    const contractCount = await prisma.merchantContract.count({
      where: {
        contractNumber: {
          startsWith: `CT-${currentYear}-`
        }
      }
    })
    const contractNumber = `CT-${currentYear}-${String(contractCount + 1).padStart(3, '0')}`

    // Déterminer le taux de commission par défaut selon le type
    const defaultRates = {
      STANDARD: 8.5,
      PREMIUM: 6.5,
      CUSTOM: validatedData.requestedCommissionRate || 5.0
    }

    // Déterminer les conditions par défaut
    const defaultConditions = {
      STANDARD: { paymentTerms: 30, minimumVolume: 1000 },
      PREMIUM: { paymentTerms: 15, minimumVolume: 5000 },
      CUSTOM: { paymentTerms: 7, minimumVolume: validatedData.expectedVolume || 10000 }
    }

    const conditions = defaultConditions[validatedData.type]

    // Créer le contrat
    const contract = await prisma.merchantContract.create({
      data: {
        contractNumber,
        merchantId: session.user.id,
        type: validatedData.type,
        status: validatedData.type === 'CUSTOM' ? 'pending_review' : 'draft',
        title: `Contrat ${validatedData.type} EcoDeli`,
        description: `Contrat ${validatedData.type.toLowerCase()} pour les services EcoDeli`,
        commissionRate: defaultRates[validatedData.type],
        paymentTerms: conditions.paymentTerms,
        minimumVolume: conditions.minimumVolume,
        autoRenewal: true,
        bonusThresholds: validatedData.type === 'PREMIUM' ? JSON.stringify([
          { volume: 10000, bonusRate: 1.0 },
          { volume: 25000, bonusRate: 1.5 }
        ]) : null
      },
      include: {
        assignedAgent: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Notification interne (simulation)
    console.log(`Nouvelle demande de contrat ${validatedData.type} pour le commerçant ${session.user.id}`)

    // Si c'est un contrat custom, créer une demande de négociation automatique
    if (validatedData.type === 'CUSTOM' && validatedData.requestedCommissionRate) {
      await prisma.contractNegotiation.create({
        data: {
          contractId: contract.id,
          requesterId: session.user.id,
          proposedCommissionRate: validatedData.requestedCommissionRate,
          reason: validatedData.specialRequirements || 'Demande de contrat personnalisé',
          status: 'pending'
        }
      })
    }

    return NextResponse.json({
      id: contract.id,
      contractNumber: contract.contractNumber,
      type: contract.type,
      status: contract.status,
      message: validatedData.type === 'CUSTOM' ? 
        'Votre demande de contrat personnalisé a été soumise. Un account manager vous contactera sous 48h.' :
        'Votre contrat a été créé. Vous pouvez maintenant le personnaliser et le signer.'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Erreur création contrat:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 