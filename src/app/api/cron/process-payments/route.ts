import { NextRequest, NextResponse } from 'next/server'
import { WalletService } from '@/features/deliverer/services/wallet.service'

/**
 * POST - Traiter automatiquement les paiements des livraisons validées
 * Cette route est appelée par un cron job toutes les heures
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé API cron
    const cronKey = request.headers.get('X-Cron-Key')
    
    if (!cronKey || cronKey !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automatic payment processing...')

    const result = await WalletService.processDeliveryPayments()

    console.log(`Payment processing completed: ${result.processed}/${result.total} deliveries processed`)

    return NextResponse.json({
      success: true,
      message: 'Paiements traités avec succès',
      processed: result.processed,
      total: result.total,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error processing payments:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors du traitement des paiements',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Obtenir le statut du traitement des paiements
 */
export async function GET(request: NextRequest) {
  try {
    const cronKey = request.headers.get('X-Cron-Key')
    
    if (!cronKey || cronKey !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Vérifier s'il y a des livraisons en attente de paiement
    const { prisma } = await import('@/lib/db')
    
    const pendingDeliveries = await prisma.delivery.count({
      where: {
        status: 'DELIVERED',
        validatedAt: {
          not: null
        },
        walletOperations: {
          none: {}
        }
      }
    })

    const pendingWithdrawals = await prisma.walletOperation.count({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      pendingDeliveries,
      pendingWithdrawals,
      lastCheck: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting payment status:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    )
  }
}