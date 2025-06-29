import { NextRequest, NextResponse } from 'next/server'
import { ProviderMonthlyBillingService } from '@/features/billing/services/provider-monthly-billing.service'
import { headers } from 'next/headers'

/**
 * POST - Déclencher la facturation mensuelle automatique
 * Cette route est appelée automatiquement chaque mois par un CRON job
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'autorisation CRON (par header secret ou IP)
    const authHeader = headers().get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Démarrage de la facturation mensuelle automatique')
    
    // Lancer le processus de facturation mensuelle
    await ProviderMonthlyBillingService.processMonthlyBilling()
    
    return NextResponse.json({
      success: true,
      message: 'Facturation mensuelle exécutée avec succès',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erreur lors de la facturation mensuelle:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET - Vérifier le statut du service de facturation
 */
export async function GET(request: NextRequest) {
  try {
    const today = new Date()
    const isExecutionDay = today.getDate() === 30
    
    return NextResponse.json({
      service: 'Monthly Billing CRON',
      status: 'active',
      nextExecution: isExecutionDay ? 'Aujourd\'hui' : 'Le 30 du mois',
      currentDate: today.toISOString(),
      message: 'Service de facturation mensuelle opérationnel'
    })

  } catch (error) {
    return NextResponse.json({
      service: 'Monthly Billing CRON',
      status: 'error',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}