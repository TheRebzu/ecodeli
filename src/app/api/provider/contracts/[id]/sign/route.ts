import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'
import { contractSignatureSchema } from '@/features/provider/schemas/contract.schema'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = contractSignatureSchema.parse(body)

    // Verify contract exists and belongs to user if provider
    const contract = await prisma.providerContract.findUnique({
      where: { id: params.id },
      include: {
        provider: {
          select: { userId: true }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Check permissions
    if (currentUser.role === 'PROVIDER' && contract.provider.userId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update signature status
    const updateData: any = {
      signedAt: new Date()
    }

    if (validatedData.signatureType === 'PROVIDER') {
      updateData.signedByProvider = true
    } else if (validatedData.signatureType === 'ECODELI') {
      updateData.signedByEcoDeli = true
    }

    // Check if both parties have signed
    const updatedContract = await prisma.providerContract.update({
      where: { id: params.id },
      data: updateData
    })

    // If both parties have signed, activate the contract
    if (updatedContract.signedByProvider && updatedContract.signedByEcoDeli) {
      await prisma.providerContract.update({
        where: { id: params.id },
        data: { status: 'ACTIVE' }
      })
    } else {
      await prisma.providerContract.update({
        where: { id: params.id },
        data: { status: 'PENDING_SIGNATURE' }
      })
    }

    return NextResponse.json({ 
      message: 'Contract signed successfully',
      contract: updatedContract
    })
  } catch (error) {
    console.error('Error signing contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 