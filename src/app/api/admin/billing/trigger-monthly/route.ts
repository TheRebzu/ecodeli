import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ProviderMonthlyBillingService } from '@/features/billing/services/provider-monthly-billing.service'

/**
 * POST - Déclencher manuellement la facturation mensuelle (Admin seulement)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🔧 Déclenchement manuel de la facturation par l'admin: ${session.user.email}`)
    
    // Lancer le processus de facturation mensuelle
    await ProviderMonthlyBillingService.processMonthlyBilling()
    
    return NextResponse.json({
      success: true,
      message: 'Facturation mensuelle déclenchée manuellement avec succès',
      triggeredBy: session.user.email,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erreur lors du déclenchement manuel:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}