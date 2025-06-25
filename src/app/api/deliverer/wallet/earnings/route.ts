import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { WalletService } from '@/features/deliverer/services/wallet.service'

/**
 * GET - Générer un rapport de gains pour une période
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
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

    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Dates de début et fin requises' },
        { status: 400 }
      )
    }

    const report = await WalletService.getEarningsReport(
      deliverer.id,
      new Date(startDate),
      new Date(endDate)
    )

    return NextResponse.json({
      success: true,
      report
    })

  } catch (error) {
    console.error('Error generating earnings report:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport' },
      { status: 500 }
    )
  }
}