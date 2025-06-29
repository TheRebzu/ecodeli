import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProviderMonthlyBillingService } from '@/features/billing/services/provider-monthly-billing.service'

/**
 * GET - Récupérer les factures du prestataire
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Profil prestataire non trouvé' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')

    const invoices = await ProviderMonthlyBillingService.getProviderInvoices(
      provider.id,
      limit
    )

    return NextResponse.json({
      success: true,
      invoices
    })

  } catch (error) {
    console.error('Error fetching provider invoices:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    )
  }
}