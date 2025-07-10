import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { signature } = await request.json()
    const contractId = params.id

    if (!signature || !signature.trim()) {
      return NextResponse.json({ 
        error: 'Signature requise' 
      }, { status: 400 })
    }

    // Vérifier que le merchant possède ce contrat
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: { contract: true }
    })

    if (!merchant || !merchant.contract || merchant.contract.id !== contractId) {
      return NextResponse.json({ 
        error: 'Contrat non trouvé' 
      }, { status: 404 })
    }

    // Vérifier que le contrat n'est pas déjà signé
    if (merchant.contract.merchantSignedAt) {
      return NextResponse.json({ 
        error: 'Contrat déjà signé' 
      }, { status: 400 })
    }

    // Signer le contrat
    const signedContract = await db.contract.update({
      where: { id: contractId },
      data: {
        merchantSignedAt: new Date(),
        merchantSignature: signature.trim(),
        // Mettre à jour le statut si les deux parties ont signé
        status: merchant.contract.adminSignedAt ? 'ACTIVE' : 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Contrat signé avec succès',
      contract: {
        id: signedContract.id,
        merchantSignedAt: signedContract.merchantSignedAt,
        status: signedContract.status,
        isFullySigned: !!(signedContract.merchantSignedAt && signedContract.adminSignedAt)
      }
    })

  } catch (error) {
    console.error('❌ Erreur signature contrat:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 