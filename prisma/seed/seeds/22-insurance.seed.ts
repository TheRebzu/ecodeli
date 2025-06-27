import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

const insurancePlans = {
  BASIC: {
    name: 'Assurance Basique',
    coverage: 50,
    premium: 2.99,
    deductible: 10,
    description: 'Couverture jusqu\'à 50€ pour les petits colis'
  },
  STANDARD: {
    name: 'Assurance Standard',
    coverage: 150,
    premium: 4.99,
    deductible: 15,
    description: 'Couverture jusqu\'à 150€ pour les colis standards'
  },
  PREMIUM: {
    name: 'Assurance Premium',
    coverage: 500,
    premium: 9.99,
    deductible: 25,
    description: 'Couverture jusqu\'à 500€ pour les colis de valeur'
  },
  ENTERPRISE: {
    name: 'Assurance Enterprise',
    coverage: 3000,
    premium: 24.99,
    deductible: 50,
    description: 'Couverture jusqu\'à 3000€ pour les envois professionnels'
  }
}

const claimReasons = [
  { reason: 'Colis endommagé', percentage: 40 },
  { reason: 'Colis perdu', percentage: 25 },
  { reason: 'Vol du colis', percentage: 15 },
  { reason: 'Contenu manquant', percentage: 10 },
  { reason: 'Retard excessif', percentage: 10 }
]

export async function seedInsurance(ctx: SeedContext) {
  const { prisma } = ctx
  const deliveries = ctx.data.get('deliveries') || []
  
  console.log('   Creating insurance policies and claims...')
  
  const policies = []
  const claims = []
  
  // Créer les plans d'assurance disponibles
  for (const [key, plan] of Object.entries(insurancePlans)) {
    await prisma.insurancePlan.create({
      data: {
        code: key,
        name: plan.name,
        description: plan.description,
        coverageAmount: plan.coverage,
        premiumAmount: plan.premium,
        deductibleAmount: plan.deductible,
        isActive: true,
        terms: {
          excludedItems: ['Cash', 'Jewelry', 'Electronics over 1000€'],
          maxClaimPeriod: 30, // jours
          requiredDocuments: ['Photos', 'Receipt', 'Delivery proof']
        }
      }
    })
  }
  
  // Créer des polices d'assurance pour 60% des livraisons
  const insuredDeliveries = deliveries.filter(() => Math.random() < 0.6)
  
  for (const delivery of insuredDeliveries) {
    // Sélectionner un plan selon la valeur déclarée
    let planKey = 'BASIC'
    const declaredValue = delivery.announcement.price * 10 // Estimation valeur colis
    
    if (declaredValue > 1000) planKey = 'ENTERPRISE'
    else if (declaredValue > 300) planKey = 'PREMIUM'
    else if (declaredValue > 100) planKey = 'STANDARD'
    
    const plan = insurancePlans[planKey as keyof typeof insurancePlans]
    const policyNumber = `POL-${new Date().getFullYear()}-${String(policies.length + 1).padStart(6, '0')}`
    
    const policy = await prisma.insurancePolicy.create({
      data: {
        policyNumber,
        deliveryId: delivery.id,
        userId: delivery.announcement.userId,
        planCode: planKey,
        coverageAmount: plan.coverage,
        premiumPaid: plan.premium,
        declaredValue: Math.min(declaredValue, plan.coverage),
        startDate: delivery.createdAt,
        endDate: new Date(delivery.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 an
        status: 'ACTIVE',
        metadata: {
          packageType: delivery.packageType,
          deliveryDistance: delivery.estimatedDistance,
          riskScore: Math.random() * 5 // Score de risque 0-5
        }
      }
    })
    policies.push(policy)
    
    // 5% de chance d'avoir une réclamation
    if (Math.random() < 0.05 && delivery.status === 'DELIVERED') {
      const claimReason = claimReasons[Math.floor(Math.random() * claimReasons.length)]
      const claimAmount = Math.min(
        declaredValue * (0.5 + Math.random() * 0.5), // 50-100% de la valeur
        plan.coverage
      )
      
      const claimNumber = `CLM-${new Date().getFullYear()}-${String(claims.length + 1).padStart(5, '0')}`
      const claimDate = new Date(delivery.actualDeliveryAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      
      const claim = await prisma.insuranceClaim.create({
        data: {
          claimNumber,
          policyId: policy.id,
          userId: policy.userId,
          claimAmount,
          reason: claimReason.reason,
          description: `${claimReason.reason} lors de la livraison. Demande d'indemnisation.`,
          status: Math.random() < 0.7 ? 'APPROVED' : (Math.random() < 0.5 ? 'PENDING' : 'REJECTED'),
          submittedAt: claimDate,
          processedAt: Math.random() < 0.7 ? new Date(claimDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
          approvedAmount: Math.random() < 0.7 ? claimAmount - plan.deductible : null,
          documents: [
            'photo_colis_1.jpg',
            'photo_colis_2.jpg',
            'facture_achat.pdf'
          ],
          investigationNotes: 'Vérification effectuée. Dommages constatés conformes à la déclaration.',
          metadata: {
            investigatorId: 'ADMIN_INSURANCE_1',
            photosProvided: true,
            receiptProvided: true,
            deliveryProofProvided: true
          }
        }
      })
      claims.push(claim)
      
      // Si approuvé, créer le paiement d'indemnisation
      if (claim.status === 'APPROVED' && claim.approvedAmount) {
        await prisma.payment.create({
          data: {
            userId: claim.userId,
            amount: claim.approvedAmount,
            currency: 'EUR',
            status: 'COMPLETED',
            type: 'INSURANCE_PAYOUT',
            description: `Indemnisation assurance - Réclamation ${claim.claimNumber}`,
            metadata: {
              claimId: claim.id,
              policyNumber: policy.policyNumber,
              payoutMethod: 'BANK_TRANSFER'
            }
          }
        })
      }
    }
  }
  
  // Créer des statistiques d'assurance globales
  const totalPolicies = policies.length
  const totalClaims = claims.length
  const approvedClaims = claims.filter((c: any) => c.status === 'APPROVED').length
  const totalPremiums = policies.reduce((sum: number, p: any) => sum + p.premiumPaid, 0)
  const totalPayouts = claims
    .filter((c: any) => c.status === 'APPROVED')
    .reduce((sum: number, c: any) => sum + (c.approvedAmount || 0), 0)
  
  await prisma.insuranceStats.create({
    data: {
      period: 'MONTHLY',
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      totalPolicies,
      totalClaims,
      approvedClaims,
      rejectedClaims: claims.filter((c: any) => c.status === 'REJECTED').length,
      totalPremiumsCollected: totalPremiums,
      totalClaimsPaid: totalPayouts,
      averageClaimAmount: totalClaims > 0 ? totalPayouts / approvedClaims : 0,
      claimApprovalRate: totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0,
      lossRatio: totalPremiums > 0 ? (totalPayouts / totalPremiums) * 100 : 0
    }
  })
  
  console.log(`   ✓ Created ${policies.length} insurance policies`)
  console.log(`   ✓ Created ${claims.length} insurance claims`)
  console.log(`   ✓ Loss ratio: ${totalPremiums > 0 ? Math.round((totalPayouts / totalPremiums) * 100) : 0}%`)
  
  return { policies, claims }
} 