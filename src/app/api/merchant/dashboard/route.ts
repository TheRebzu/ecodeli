import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { MerchantService } from '@/features/merchant/services/merchant.service'

export async function GET(request: NextRequest) {
  try {
    console.log('🏪 [GET /api/merchant/dashboard] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Utilisation du service merchant qui respecte les schémas Prisma fragmentés
    const dashboardData = await MerchantService.getDashboardData(user.id)

    console.log(`✅ Dashboard data récupéré pour commerçant ${user.id}`)

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('❌ Erreur récupération dashboard commerçant:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}