import { PrismaClient } from '@prisma/client'
import { SeedContext } from '../config/seed.config'
import { ROLES } from '../data/constants'

export async function seedContracts(prisma: PrismaClient, context: SeedContext) {
  console.log('📋 Seeding contracts data...')

  const merchants = await prisma.user.findMany({
    where: { role: ROLES.MERCHANT },
    include: { profile: true }
  })

  // Types de contrats EcoDeli
  const contractTypes = [
    {
      name: 'Contrat Standard',
      code: 'STANDARD',
      description: 'Contrat de base pour les commerçants',
      commissionRate: 8.5, // %
      fixedFee: 0,
      minimumMonthlyVolume: 0,
      maxDeliveryRadius: 15, // km
      features: ['Livraison standard', 'Support client', 'Interface marchande'],
      paymentTerms: 'NET_30',
      renewalType: 'AUTOMATIC',
      contractDuration: 12 // mois
    },
    {
      name: 'Contrat Premium',
      code: 'PREMIUM',
      description: 'Contrat pour les gros volumes',
      commissionRate: 6.5, // %
      fixedFee: 50,
      minimumMonthlyVolume: 1000,
      maxDeliveryRadius: 30, // km
      features: ['Livraison prioritaire', 'Support dédié', 'Analytics avancées', 'API complète'],
      paymentTerms: 'NET_15',
      renewalType: 'AUTOMATIC',
      contractDuration: 24 // mois
    },
    {
      name: 'Contrat Enterprise',
      code: 'ENTERPRISE',
      description: 'Contrat sur mesure pour les grandes enseignes',
      commissionRate: 4.5, // %
      fixedFee: 200,
      minimumMonthlyVolume: 5000,
      maxDeliveryRadius: 50, // km
      features: ['Livraison express', 'Account manager', 'SLA garanti', 'Intégration sur mesure'],
      paymentTerms: 'NET_7',
      renewalType: 'MANUAL',
      contractDuration: 36 // mois
    }
  ]

  // Créer les types de contrats
  for (const contractType of contractTypes) {
    await prisma.contractType.upsert({
      where: { code: contractType.code },
      update: {},
      create: contractType
    })
  }

  // Créer les contrats pour les commerçants
  for (const merchant of merchants) {
    if (!merchant.profile) continue

    const index = merchants.indexOf(merchant)
    
    // Assigner un type de contrat selon l'index
    const contractTypeCode = index === 0 ? 'ENTERPRISE' : 
                           index === 1 ? 'PREMIUM' : 'STANDARD'

    const contractType = contractTypes.find(ct => ct.code === contractTypeCode)!
    
    const signedDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
    const endDate = new Date(signedDate.getTime() + contractType.contractDuration * 30 * 24 * 60 * 60 * 1000)

    const contract = await prisma.merchantContract.upsert({
      where: { merchantId: merchant.id },
      update: {},
      create: {
        merchantId: merchant.id,
        contractTypeId: contractType.code,
        contractNumber: `CTR-${new Date().getFullYear()}-${(index + 1).toString().padStart(4, '0')}`,
        status: Math.random() > 0.1 ? 'ACTIVE' : 'PENDING_SIGNATURE',
        signedDate: Math.random() > 0.1 ? signedDate : null,
        startDate: Math.random() > 0.1 ? signedDate : new Date(),
        endDate: endDate,
        commissionRate: contractType.commissionRate + (Math.random() - 0.5), // Variation de ±0.5%
        fixedMonthlyFee: contractType.fixedFee,
        minimumMonthlyVolume: contractType.minimumMonthlyVolume,
        maxDeliveryRadius: contractType.maxDeliveryRadius,
        paymentTerms: contractType.paymentTerms,
        autoRenewal: contractType.renewalType === 'AUTOMATIC',
        specialConditions: index === 0 ? 'Conditions négociées spécialement' : null,
        signedByMerchant: Math.random() > 0.1,
        signedByEcoDeli: Math.random() > 0.05,
        ecoDeliSignatory: 'Pierre Chabrier', // DRH
        merchantSignatory: merchant.profile?.firstName + ' ' + merchant.profile?.lastName,
        documentUrl: `https://contracts.ecodeli.fr/merchants/${merchant.id}/contract.pdf`
      }
    })

    // Créer les SLA (Service Level Agreements) pour les contrats premium et enterprise
    if (contractTypeCode === 'PREMIUM' || contractTypeCode === 'ENTERPRISE') {
      await prisma.serviceLevelAgreement.upsert({
        where: { contractId: contract.id },
        update: {},
        create: {
          contractId: contract.id,
          maxDeliveryTime: contractTypeCode === 'ENTERPRISE' ? 2 : 4, // heures
          uptimeGuarantee: contractTypeCode === 'ENTERPRISE' ? 99.9 : 99.5, // %
          responseTime: contractTypeCode === 'ENTERPRISE' ? 15 : 30, // minutes
          resolutionTime: contractTypeCode === 'ENTERPRISE' ? 2 : 4, // heures
          refundPolicy: 'Remboursement automatique si SLA non respecté',
          penalties: contractTypeCode === 'ENTERPRISE' ? 'Pénalités de 5% par heure de retard' : null,
          escalationProcedure: 'Escalade automatique vers account manager après 1h',
          emergencyContact: '+33142345678',
          reportingFrequency: 'MONTHLY'
        }
      })
    }

    // Créer les avenants au contrat
    if (index < 2 && Math.random() > 0.5) {
      await prisma.contractAmendment.create({
        data: {
          contractId: contract.id,
          amendmentNumber: 1,
          type: 'COMMISSION_CHANGE',
          description: 'Réduction de commission suite à l\'augmentation du volume',
          oldValue: contractType.commissionRate.toString(),
          newValue: (contractType.commissionRate - 0.5).toString(),
          effectiveDate: new Date(signedDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 mois après
          approvedDate: new Date(signedDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000 - 7 * 24 * 60 * 60 * 1000),
          approvedBy: 'Direction EcoDeli',
          documentUrl: `https://contracts.ecodeli.fr/merchants/${merchant.id}/amendment-1.pdf`
        }
      })
    }

    // Créer l'historique de facturation
    const monthsHistory = 6
    for (let i = 0; i < monthsHistory; i++) {
      const month = new Date()
      month.setMonth(month.getMonth() - i)
      
      const deliveriesCount = Math.floor(Math.random() * 200) + 50
      const totalRevenue = deliveriesCount * (Math.random() * 30 + 10) // 10-40€ par livraison
      const commissionAmount = totalRevenue * (contract.commissionRate / 100)

      await prisma.merchantBilling.upsert({
        where: {
          contractId_month_year: {
            contractId: contract.id,
            month: month.getMonth() + 1,
            year: month.getFullYear()
          }
        },
        update: {},
        create: {
          contractId: contract.id,
          month: month.getMonth() + 1,
          year: month.getFullYear(),
          deliveriesCount,
          totalRevenue,
          commissionRate: contract.commissionRate,
          commissionAmount,
          fixedFee: contract.fixedMonthlyFee,
          totalAmount: commissionAmount + contract.fixedMonthlyFee,
          invoiceNumber: `INV-${month.getFullYear()}-${(month.getMonth() + 1).toString().padStart(2, '0')}-${merchant.id.substr(0, 8)}`,
          invoiceDate: new Date(month.getFullYear(), month.getMonth() + 1, 1),
          dueDate: new Date(month.getFullYear(), month.getMonth() + 1, contract.paymentTerms === 'NET_7' ? 8 : contract.paymentTerms === 'NET_15' ? 16 : 31),
          paymentStatus: Math.random() > 0.2 ? 'PAID' : 'PENDING',
          paidDate: Math.random() > 0.2 ? new Date(month.getFullYear(), month.getMonth() + 1, Math.floor(Math.random() * 20) + 5) : null
        }
      })
    }

    context.logger?.log(`Created contract for merchant ${merchant.email} (${contractTypeCode})`)
  }

  // Créer les métriques de performance des contrats
  const totalContracts = await prisma.merchantContract.count()
  const activeContracts = await prisma.merchantContract.count({ where: { status: 'ACTIVE' } })
  
  await prisma.contractMetrics.upsert({
    where: { month_year: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } },
    update: {},
    create: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalContracts,
      activeContracts,
      newContracts: Math.floor(totalContracts * 0.1),
      renewedContracts: Math.floor(totalContracts * 0.8),
      terminatedContracts: Math.floor(totalContracts * 0.05),
      averageCommissionRate: 6.5,
      totalRevenue: Math.floor(Math.random() * 100000) + 50000,
      averageContractValue: Math.floor(Math.random() * 5000) + 2000
    }
  })

  context.logger?.log(`✅ Contracts seeding completed - ${merchants.length} contracts processed`)
} 