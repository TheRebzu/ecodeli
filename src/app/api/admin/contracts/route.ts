import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ContractService } from '@/features/contracts/services/contract.service'

const createContractSchema = z.object({
  merchantId: z.string().cuid('ID merchant invalide'),
  templateId: z.string().cuid().optional(),
  customTerms: z.object({
    commissionRate: z.number().min(0).max(1).optional(),
    minCommissionFee: z.number().min(0).optional(),
    paymentTerms: z.number().min(1).max(90).optional(),
    cancellationPolicy: z.string().optional(),
    deliveryZones: z.array(z.string()).optional(),
    serviceLevel: z.string().optional(),
    supportHours: z.string().optional(),
    additionalServices: z.array(z.string()).optional()
  }).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  signedBy: z.string().optional()
})

// GET - Liste des contrats avec filtres
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    const status = searchParams.get('status')
    const stats = searchParams.get('stats') === 'true'

    if (stats) {
      const contractStats = await ContractService.getContractStats()
      return NextResponse.json(contractStats)
    }

    if (merchantId) {
      const contracts = await ContractService.getMerchantContracts(merchantId)
      return NextResponse.json(contracts)
    }

    // Récupérer tous les contrats avec filtres
    const contracts = await prisma.contract.findMany({
      where: status ? { status } : undefined,
      include: {
        merchant: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(contracts)

  } catch (error) {
    console.error('Erreur récupération contrats:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// POST - Créer un nouveau contrat
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createContractSchema.parse(body)

    const contract = await ContractService.createContract({
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined
    })

    return NextResponse.json({
      success: true,
      message: 'Contrat créé avec succès',
      contract
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur création contrat:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la création du contrat'
    }, { status: 500 })
  }
}