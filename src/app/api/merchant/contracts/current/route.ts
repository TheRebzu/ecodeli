import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le merchant et son contrat
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        contract: true
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil merchant non trouvé' }, { status: 404 })
    }

    // Si pas de contrat, créer un contrat par défaut
    let contract = merchant.contract
    if (!contract) {
      contract = await db.contract.create({
        data: {
          merchantId: merchant.id,
          type: 'STANDARD',
          status: 'DRAFT',
          title: `Contrat EcoDeli - ${merchant.companyName}`,
          description: 'Contrat standard de partenariat commercial EcoDeli',
          version: '1.0',
          commissionRate: 15.0,
          setupFee: 0,
          monthlyFee: 0,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
          autoRenewal: true,
          renewalPeriod: 12,
          maxOrdersPerMonth: 100,
          allowedServices: ['CART_DROP', 'PACKAGE_DELIVERY']
        }
      })
    }

    // Calculer si le contrat est complètement signé
    const isFullySigned = !!(contract.merchantSignedAt && contract.adminSignedAt)
    
    // Calculer les jours jusqu'à expiration
    let daysUntilExpiry
    if (contract.validUntil) {
      const today = new Date()
      const expiry = new Date(contract.validUntil)
      daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        type: contract.type,
        status: contract.status,
        version: contract.version,
        title: contract.title,
        description: contract.description,
        commissionRate: contract.commissionRate,
        minCommissionAmount: contract.minCommissionAmount,
        setupFee: contract.setupFee,
        monthlyFee: contract.monthlyFee,
        validFrom: contract.validFrom,
        validUntil: contract.validUntil,
        autoRenewal: contract.autoRenewal,
        renewalPeriod: contract.renewalPeriod,
        maxOrdersPerMonth: contract.maxOrdersPerMonth,
        maxOrderValue: contract.maxOrderValue,
        merchantSignedAt: contract.merchantSignedAt,
        adminSignedAt: contract.adminSignedAt,
        isFullySigned,
        daysUntilExpiry: daysUntilExpiry && daysUntilExpiry > 0 ? daysUntilExpiry : undefined,
        createdAt: contract.createdAt
      }
    })

  } catch (error) {
    console.error('❌ Erreur récupération contrat merchant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 