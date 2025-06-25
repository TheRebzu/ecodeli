import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ContractService } from '@/features/contracts/services/contract.service'

const signContractSchema = z.object({
  signedBy: z.string().min(1, 'Nom du signataire requis'),
  signature: z.string().optional()
})

const terminateContractSchema = z.object({
  reason: z.string().min(1, 'Raison de r�siliation requise'),
  terminatedBy: z.string().min(1, 'Nom du responsable requis')
})

const renewContractSchema = z.object({
  newEndDate: z.string().datetime(),
  updatedTerms: z.object({
    commissionRate: z.number().min(0).max(1).optional(),
    minCommissionFee: z.number().min(0).optional(),
    paymentTerms: z.number().min(1).max(90).optional()
  }).optional()
})

// PUT - Mettre � jour un contrat (signature, r�siliation, renouvellement)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acc�s non autoris�' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    switch (action) {
      case 'sign':
        const signData = signContractSchema.parse(body)
        const signedContract = await ContractService.signContract(
          params.id,
          signData.signedBy,
          signData.signature
        )
        return NextResponse.json({
          success: true,
          message: 'Contrat sign� avec succ�s',
          contract: signedContract
        })

      case 'terminate':
        const terminateData = terminateContractSchema.parse(body)
        const terminatedContract = await ContractService.terminateContract(
          params.id,
          terminateData.reason,
          terminateData.terminatedBy
        )
        return NextResponse.json({
          success: true,
          message: 'Contrat r�sili� avec succ�s',
          contract: terminatedContract
        })

      case 'renew':
        const renewData = renewContractSchema.parse(body)
        const renewedContract = await ContractService.renewContract(
          params.id,
          new Date(renewData.newEndDate),
          renewData.updatedTerms
        )
        return NextResponse.json({
          success: true,
          message: 'Contrat renouvel� avec succ�s',
          contract: renewedContract
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Action non support�e'
        }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Donn�es invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur mise � jour contrat:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de la mise � jour du contrat'
    }, { status: 500 })
  }
}

// DELETE - Supprimer un contrat (uniquement si DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acc�s non autoris�' }, { status: 401 })
    }

    const contract = await prisma.contract.findUnique({
      where: { id: params.id }
    })

    if (!contract) {
      return NextResponse.json({
        success: false,
        message: 'Contrat non trouv�'
      }, { status: 404 })
    }

    if (contract.status !== 'DRAFT') {
      return NextResponse.json({
        success: false,
        message: 'Seuls les contrats en brouillon peuvent �tre supprim�s'
      }, { status: 400 })
    }

    await prisma.contract.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Contrat supprim� avec succ�s'
    })

  } catch (error) {
    console.error('Erreur suppression contrat:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la suppression du contrat'
    }, { status: 500 })
  }
}