import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

export async function seedContracts(ctx: SeedContext) {
  const { prisma } = ctx
  console.log('Seeding contracts data...')

  const merchants = await prisma.merchant.findMany({
    include: { user: true }
  })

  console.log(`Found ${merchants.length} merchants`)

  // Créer les contrats pour les commerçants
  for (const merchant of merchants) {
    const index = merchants.indexOf(merchant)
    
    // Assigner un type de contrat selon l'index
    const contractType = index === 0 ? 'CUSTOM' : 
                        index === 1 ? 'PREMIUM' : 'STANDARD'

    const commissionRates = {
      STANDARD: 8.5,
      PREMIUM: 6.5,
      CUSTOM: 4.5
    }

    const monthlyFees = {
      STANDARD: 0,
      PREMIUM: 50,
      CUSTOM: 200
    }
    
    const signedDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
    const validUntil = new Date(signedDate.getTime() + 12 * 30 * 24 * 60 * 60 * 1000) // 12 mois

    const contract = await prisma.contract.create({
      data: {
        merchantId: merchant.id,
        type: contractType as any,
        status: Math.random() > 0.1 ? 'ACTIVE' : 'PENDING_SIGNATURE',
        title: `Contrat EcoDeli ${contractType}`,
        description: `Contrat de partenariat EcoDeli type ${contractType}`,
        commissionRate: commissionRates[contractType as keyof typeof commissionRates],
        setupFee: contractType === 'CUSTOM' ? 500 : 0,
        monthlyFee: monthlyFees[contractType as keyof typeof monthlyFees],
        validFrom: signedDate,
        validUntil: validUntil,
        autoRenewal: contractType !== 'CUSTOM',
        renewalPeriod: contractType === 'CUSTOM' ? 36 : 12,
        maxOrdersPerMonth: contractType === 'STANDARD' ? 100 : null,
        maxOrderValue: contractType === 'STANDARD' ? 500 : null,
        deliveryZones: [
          { zone: 'PARIS_CENTER', radius: contractType === 'CUSTOM' ? 50 : 25 },
          { zone: 'SUBURBS', radius: contractType === 'STANDARD' ? 15 : 30 }
        ],
        allowedServices: ['DELIVERY', 'EXPRESS_DELIVERY', ...(contractType === 'CUSTOM' ? ['PRIORITY_DELIVERY'] : [])],
        merchantSignedAt: Math.random() > 0.1 ? signedDate : null,
        merchantSignature: Math.random() > 0.1 ? 'merchant_signature_hash' : null,
        adminSignedAt: Math.random() > 0.05 ? signedDate : null,
        adminSignedBy: Math.random() > 0.05 ? 'admin123' : null,
        adminSignature: Math.random() > 0.05 ? 'admin_signature_hash' : null,
        templatePath: `/contracts/templates/${contractType.toLowerCase()}.pdf`,
        signedDocumentPath: Math.random() > 0.1 ? `/contracts/signed/${merchant.id}_contract.pdf` : null,
        notes: index === 0 ? 'Conditions négociées spécialement' : null,
        tags: [contractType.toLowerCase(), 'active']
      }
    })

    // Créer les avenants au contrat pour certains contrats
    if (index < 3 && Math.random() > 0.5) {
      await prisma.contractAmendment.create({
        data: {
          contractId: contract.id,
          version: '1.1',
          title: 'Avenant - Réduction commission',
          description: 'Réduction de commission suite à l\'augmentation du volume',
          changes: {
            oldCommissionRate: commissionRates[contractType as keyof typeof commissionRates],
            newCommissionRate: commissionRates[contractType as keyof typeof commissionRates] - 0.5,
            reason: 'Volume mensuel dépassé'
          },
          effectiveDate: new Date(signedDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 mois après
          merchantSignedAt: new Date(signedDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000 - 3 * 24 * 60 * 60 * 1000),
          adminSignedAt: new Date(signedDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000 - 1 * 24 * 60 * 60 * 1000),
          adminSignedBy: 'admin123'
        }
      })
    }

    // Créer l'historique de facturation pour les 6 derniers mois
    const monthsHistory = 6
    for (let i = 0; i < monthsHistory; i++) {
      const periodStart = new Date()
      periodStart.setMonth(periodStart.getMonth() - i - 1)
      periodStart.setDate(1)
      
      const periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      periodEnd.setDate(0) // Dernier jour du mois
      
      const totalOrders = Math.floor(Math.random() * 150) + 30
      const totalRevenue = totalOrders * (Math.random() * 25 + 15) // 15-40€ par commande
      const commissionAmount = totalRevenue * (contract.commissionRate / 100)

      await prisma.merchantBilling.create({
        data: {
          merchantId: merchant.id,
          contractId: contract.id,
          periodStart,
          periodEnd,
          status: Math.random() > 0.2 ? 'PAID' : 'PENDING',
          totalOrders,
          totalRevenue,
          commissionAmount,
          monthlyFee: contract.monthlyFee,
          additionalFees: Math.random() > 0.8 ? Math.random() * 50 : 0,
          totalAmount: commissionAmount + contract.monthlyFee,
          invoiceNumber: `INV-${periodStart.getFullYear()}-${(periodStart.getMonth() + 1).toString().padStart(2, '0')}-${merchant.id.substr(0, 8)}`,
          invoicePath: `/invoices/${merchant.id}/${periodStart.getFullYear()}-${periodStart.getMonth() + 1}.pdf`,
          dueDate: new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 jours après fin de période
          paidAt: Math.random() > 0.2 ? new Date(periodEnd.getTime() + Math.random() * 25 * 24 * 60 * 60 * 1000) : null,
          paymentMethod: Math.random() > 0.2 ? 'BANK_TRANSFER' : null
        }
      })
    }

    console.log(`Created contract for merchant ${merchant.user.email} (${contractType})`)
  }

  console.log(`Contracts seeding completed - ${merchants.length} contracts processed`)
} 