import { SeedContext } from '../index'

export async function cleanDatabase(ctx: SeedContext) {
  console.log('🧹 Cleaning database...')
  
  const { prisma } = ctx
  
  // Ordre de suppression important pour respecter les contraintes FK
  const deletionOrder = [
    // Niveau 5 - Tables sans dépendances descendantes
    'linkAnalytics',
    'influencerPost',
    'influencerLink',
    'influencerCampaign',
    'referralActivity',
    'referralReward',
    'referralStats',
    'warrantyClaim',
    'deliveryWarranty',
    'serviceWarranty',
    'claimPayment',
    'claimAssessment',
    'insuranceClaim',
    'insuranceCoverage',
    'insuranceAudit',
    'riskAssessment',
    'certificationAudit',
    'qualificationRequirement',
    'certificationTemplate',
    'examSession',
    'moduleProgress',
    'delivererCertification',
    'providerCertification',
    'certificationModule',
    'supportMetrics',
    'supportTemplate',
    'supportKnowledgeBase',
    'ticketSatisfaction',
    'ticketEscalation',
    'messageAttachment',
    'ticketMessage',
    'ticketAttachment',
    'geofenceEntry',
    'locationUpdate',
    'delivererLocation',
    'tutorialFeedback',
    'tutorialStep',
    'merchantBilling',
    'contractAmendment',
    'systemNotification',
    'activityLog',
    'settings',
    'analytics',
    'review',
    'notificationPreference',
    'documentGeneration',
    'storageBoxRental',
    'orderItem',
    'invoiceItem',
    'deliveryStatusHistory',
    'proofOfDelivery',
    'handover',
    'deliveryHistory',
    'trackingUpdate',
    'deliveryValidation',
    'providerInvoiceIntervention',
    'providerAvailabilityBlock',
    'providerTimeSlot',
    'intervention',
    'availability',
    'providerRate',
    'providerAvailability',
    'delivererAvailability',
    'nFCCard',
    'deliveryRoute',
    'cartDropConfig',
    'availability',
    'globalAvailability',
    'clientTutorialProgress',
    'contractAmendment',
    'verificationToken',
    'passwordReset',
    'verification',
    
    // Niveau 4 - Tables avec dépendances moyennes
    'proposalStatus',
    'announcementGroup',
    'auctionBid',
    'dispute',
    'reverseAuction',
    'deliveryGroup',
    'groupingProposal',
    'referral',
    'referralCode',
    'influencerProgram',
    'warranty',
    'insurancePolicy',
    'certification',
    'supportTicket',
    'trackingSession',
    'geofence',
    'contract',
    'notification',
    'announcementNotification',
    'announcementAttachment',
    'announcementTracking',
    'routeMatch',
    'delivererRoute',
    'serviceAnnouncement',
    'packageAnnouncement',
    
    // Niveau 3 - Tables avec dépendances fortes
    'walletOperation',
    'wallet',
    'invoice',
    'booking',
    'payment',
    'delivery',
    'announcement',
    'storageBox',
    'warehouse',
    'location',
    'document',
    'providerMonthlyInvoice',
    'order',
    'service',
    
    // Niveau 2 - Tables de profils
    'admin',
    'provider',
    'merchant',
    'deliverer',
    'client',
    'profile',
    
    // Niveau 1 - Tables de base
    'referralProgram',
    'session',
    'account',
    'user'
  ]
  
  // Suppression dans l'ordre
  for (const model of deletionOrder) {
    try {
      if (prisma[model]) {
        const count = await prisma[model].deleteMany()
        if (count.count > 0) {
          console.log(`   ✓ Deleted ${count.count} records from ${model}`)
        }
      }
    } catch (error) {
      // Ignorer les erreurs si la table n'existe pas
      if (!error.message.includes('Unknown arg')) {
        console.warn(`   ⚠️  Warning cleaning ${model}:`, error.message)
      }
    }
  }
  
  console.log('✅ Database cleaned successfully')
} 