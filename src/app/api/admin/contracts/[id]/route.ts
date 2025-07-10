import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ContractService } from '@/features/contracts/services/contract.service'

const signatureSchema = z.object({
  signature: z.string().min(1),
  signedBy: z.string().min(1),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
})

const terminationSchema = z.object({
  reason: z.string().min(1),
  terminatedBy: z.string().min(1),
  effectiveDate: z.string().datetime().optional()
})

/**
 * GET - Récupérer un contrat par ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contract = await ContractService.getContractById((await params).id)

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrat non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ contract })

  } catch (error) {
    console.error('Error getting contract:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du contrat' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Mettre à jour un contrat (signature, résiliation, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    switch (action) {
      case 'sign': {
        const validatedData = signatureSchema.parse(body)
        
        const contract = await ContractService.signByAdmin(
          (await params).id,
          session.user.id,
          {
            signature: validatedData.signature,
            signedBy: validatedData.signedBy,
            ipAddress: validatedData.ipAddress,
            userAgent: validatedData.userAgent
          }
        )

        return NextResponse.json({
          success: true,
          message: 'Contrat signé avec succès',
          contract
        })
      }

      case 'terminate': {
        const validatedData = terminationSchema.parse({
          ...body,
          effectiveDate: body.effectiveDate ? new Date(body.effectiveDate).toISOString() : undefined
        })
        
        await ContractService.terminateContract(
          (await params).id,
          validatedData.terminatedBy,
          validatedData.reason,
          validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : undefined
        )

        return NextResponse.json({
          success: true,
          message: 'Contrat résilié avec succès'
        })
      }

      case 'validate': {
        const validation = await ContractService.validateContract((await params).id)
        
        return NextResponse.json({
          success: true,
          validation
        })
      }

      default:
        return NextResponse.json(
          { error: 'Action non reconnue' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error updating contract:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du contrat' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un contrat (uniquement si DRAFT)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acc�s non autoris�' }, { status: 401 })
    }

    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id: id }
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
      where: { id: id }
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