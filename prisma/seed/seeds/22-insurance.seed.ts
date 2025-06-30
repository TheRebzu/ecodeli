import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

export async function seedInsurance(ctx: SeedContext) {
  const { prisma } = ctx
  const deliveries = ctx.data.get('deliveries') || []
  const bookings = ctx.data.get('bookings') || []
  
  console.log('   Creating insurance policies and claims...')
  
  const policies = []
  const claims = []
  
  // Créer quelques polices d'assurance de base
  const basicPolicies = [
    {
      name: 'Assurance Transport Basic',
      description: 'Couverture basique pour les livraisons',
      category: 'GOODS_TRANSPORT',
      provider: 'EcoDeli Assurance',
      policyNumber: 'TRANS-BASIC-2024',
      coverageAmount: 500,
      deductible: 25,
      premiumAmount: 49.99,
      terms: { maxWeight: '30kg', maxValue: '500€' },
      coverageDetails: { damageRate: '100%', theftRate: '100%', lossRate: '80%' },
      exclusions: ['Precious metals', 'Cash', 'Perishable goods']
    },
    {
      name: 'Assurance Transport Premium',
      description: 'Couverture premium pour les livraisons de valeur',
      category: 'GOODS_TRANSPORT',
      provider: 'EcoDeli Assurance',
      policyNumber: 'TRANS-PREMIUM-2024',
      coverageAmount: 2000,
      deductible: 50,
      premiumAmount: 99.99,
      terms: { maxWeight: '50kg', maxValue: '2000€' },
      coverageDetails: { damageRate: '100%', theftRate: '100%', lossRate: '100%' },
      exclusions: ['Precious metals', 'Cash']
    },
    {
      name: 'Responsabilité Civile Professionnelle',
      description: 'Couverture RC pour les prestataires',
      category: 'PROFESSIONAL_LIABILITY',
      provider: 'EcoDeli Assurance',
      policyNumber: 'RCP-PRO-2024',
      coverageAmount: 10000,
      deductible: 150,
      premiumAmount: 199.99,
      terms: { coverage: 'Professional activities', territory: 'France' },
      coverageDetails: { personalInjury: '100%', propertyDamage: '100%' },
      exclusions: ['Intentional acts', 'Criminal acts']
    }
  ]
  
  for (const policyData of basicPolicies) {
    const startDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    
    const policy = await prisma.insurancePolicy.create({
      data: {
        ...policyData,
        category: policyData.category as any,
        startDate,
        endDate,
        isActive: endDate > new Date()
      }
    })
    policies.push(policy)
    
    console.log(`Created insurance policy: ${policy.name}`)
  }
  
  // Créer quelques couvertures spécifiques
  const transportPolicy = policies.find(p => p.category === 'GOODS_TRANSPORT')
  const liabilityPolicy = policies.find(p => p.category === 'PROFESSIONAL_LIABILITY')
  
  if (transportPolicy && deliveries.length > 0) {
    // Couvrir quelques livraisons
    const coveredDeliveries = deliveries.slice(0, Math.min(3, deliveries.length))
    
    for (const delivery of coveredDeliveries) {
      const coverage = await prisma.insuranceCoverage.create({
        data: {
          policyId: transportPolicy.id,
          entityType: 'delivery',
          entityId: delivery.id,
          coverageType: 'DAMAGE_COVERAGE' as any,
          isActive: true,
          maxCoverage: 500,
          currentUsage: 0,
          metadata: {
            deliveryType: delivery.type || 'PACKAGE',
            estimatedValue: 100 + Math.random() * 300
          }
        }
      })
      
      // 20% de chance d'avoir une réclamation
      if (Math.random() < 0.2) {
        const claimAmount = 50 + Math.random() * 200
        const incidentDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        
        // Récupérer l'utilisateur qui a créé l'annonce
        const announcement = await prisma.announcement.findUnique({
          where: { id: delivery.announcementId },
          include: { author: true }
        })
        
        if (!announcement) {
          console.log(`   Skipping claim for delivery ${delivery.id} - announcement not found`)
          continue
        }
        
        const claim = await prisma.insuranceClaim.create({
          data: {
            claimNumber: `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            policyId: transportPolicy.id,
            coverageId: coverage.id,
            claimantId: announcement.authorId, // Utiliser l'ID de l'auteur de l'annonce
            incidentDate,
            claimType: ['DAMAGE', 'THEFT', 'LOSS'][Math.floor(Math.random() * 3)] as any,
            status: ['REPORTED', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any,
            amount: claimAmount,
            approvedAmount: Math.random() > 0.3 ? claimAmount * 0.8 : null,
            description: 'Dommage constaté lors de la livraison',
            circumstances: 'Le colis a été endommagé pendant le transport',
            evidences: [
              { type: 'photo', url: 'evidence1.jpg' },
              { type: 'receipt', url: 'receipt.pdf' }
            ]
          }
        })
        claims.push(claim)
      }
    }
  }
  
  // Créer quelques garanties
  const warranties = [
    {
      name: 'Garantie Qualité Service',
      description: 'Garantie de qualité pour les prestations de service',
      warrantyType: 'SERVICE_QUALITY',
      duration: 30, // 30 jours
      scope: { coverage: 'Service quality issues', refundRate: '100%' },
      conditions: { minServiceDuration: 60, applicableServices: ['cleaning', 'gardening'] },
      exclusions: [{ type: 'weather', description: 'Weather-related cancellations' }]
    },
    {
      name: 'Garantie Livraison',
      description: 'Garantie de livraison dans les délais',
      warrantyType: 'DELIVERY_GUARANTEE',
      duration: 7, // 7 jours
      scope: { coverage: 'Delivery delays', compensationRate: '50%' },
      conditions: { maxDelay: 24, applicableZones: ['urban', 'suburban'] },
      exclusions: [{ type: 'force_majeure', description: 'Force majeure events' }]
    }
  ]
  
  for (const warrantyData of warranties) {
    await prisma.warranty.create({
      data: {
        ...warrantyData,
        warrantyType: warrantyData.warrantyType as any
      }
    })
  }
  
  // Créer des évaluations de risque pour quelques utilisateurs
  const users = ctx.data.get('users') || []
  for (let i = 0; i < Math.min(5, users.length); i++) {
    const user = users[i]
    const riskScore = Math.random() * 100
    let riskLevel = 'LOW'
    if (riskScore > 70) riskLevel = 'HIGH'
    else if (riskScore > 40) riskLevel = 'MEDIUM'
    
    await prisma.riskAssessment.create({
      data: {
        entityType: 'user',
        entityId: user.id,
        riskLevel: riskLevel as any,
        riskFactors: [
          { factor: 'Activity level', weight: 0.3 },
          { factor: 'Past claims', weight: 0.4 },
          { factor: 'Account age', weight: 0.3 }
        ],
        score: riskScore,
        recommendations: [
          { type: 'monitoring', description: 'Regular activity monitoring' }
        ]
      }
    })
  }
  
  console.log(`   ✓ Created ${policies.length} insurance policies`)
  console.log(`   ✓ Created ${claims.length} insurance claims`)
  console.log(`   ✓ Created ${warranties.length} warranties`)
  
  return { policies, claims }
} 