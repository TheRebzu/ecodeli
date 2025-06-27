import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { WalletService } from '@/features/deliverer/services/wallet.service'

/**
 * GET - Récupérer les informations du wallet du livreur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json(
        { error: 'Profil livreur non trouvé' },
        { status: 404 }
      )
    }

    const walletInfo = await WalletService.getWalletBalance(deliverer.id)

    return NextResponse.json({
      success: true,
      wallet: walletInfo
    })

  } catch (error) {
    console.error('Error getting wallet info:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du wallet' },
      { status: 500 }
    )
  }
}