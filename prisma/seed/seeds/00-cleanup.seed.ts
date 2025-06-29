import { SeedContext } from '../index'

export async function cleanDatabase(context: SeedContext) {
  const { prisma } = context
  
  console.log('Cleaning up database...')
  
  // Supprimer dans l'ordre des dépendances (du plus dépendant au moins dépendant)
  const cleanupOperations = [
    // 1. Tutoriels et feedback
    () => prisma.tutorialFeedback.deleteMany(),
    () => prisma.tutorialStep.deleteMany(),
    () => prisma.clientTutorialProgress.deleteMany(),
    
    // 2. Finances
    () => prisma.walletOperation.deleteMany(),
    () => prisma.payment.deleteMany(),
    () => prisma.wallet.deleteMany(),
    
    // 3. Livraisons et réservations
    () => prisma.proofOfDelivery.deleteMany(),
    () => prisma.handover.deleteMany(),
    () => prisma.trackingUpdate.deleteMany(),
    () => prisma.deliveryStatusHistory.deleteMany(),
    () => prisma.deliveryHistory.deleteMany(),
    () => prisma.deliveryValidation.deleteMany(),
    () => prisma.delivery.deleteMany(),
    
    () => prisma.intervention.deleteMany(),
    () => prisma.booking.deleteMany(),
    
    // 4. Annonces
    () => prisma.announcementNotification.deleteMany(),
    () => prisma.announcementAttachment.deleteMany(),
    () => prisma.serviceAnnouncement.deleteMany(),
    () => prisma.packageAnnouncement.deleteMany(),
    () => prisma.announcement.deleteMany(),
    
    // 5. Services et disponibilités
    () => prisma.providerTimeSlot.deleteMany(),
    () => prisma.providerAvailability.deleteMany(),
    () => prisma.service.deleteMany(),
    
    // 6. Documents et générations
    () => prisma.documentGeneration.deleteMany(),
    () => prisma.document.deleteMany(),
    
    // 7. Stockage
    () => prisma.storageBoxRental.deleteMany(),
    () => prisma.storageBox.deleteMany(),
    () => prisma.warehouse.deleteMany(),
    
    // 8. Commandes et contrats
    () => prisma.orderItem.deleteMany(),
    () => prisma.order.deleteMany(),
    () => prisma.cartDropConfig.deleteMany(),
    () => prisma.contract.deleteMany(),
    
    // 9. Avis et notifications
    () => prisma.review.deleteMany(),
    () => prisma.notification.deleteMany(),
    
    // 10. Routes et disponibilités livreurs
    () => prisma.delivererAvailability.deleteMany(),
    () => prisma.deliveryRoute.deleteMany(),
    () => prisma.availability.deleteMany(),
    () => prisma.globalAvailability.deleteMany(),
    
    // 11. Cartes NFC
    () => prisma.nFCCard.deleteMany(),
    
    // 12. Profils spécialisés
    () => prisma.admin.deleteMany(),
    () => prisma.provider.deleteMany(),
    () => prisma.merchant.deleteMany(),
    () => prisma.deliverer.deleteMany(),
    () => prisma.client.deleteMany(),
    
    // 13. Profils et utilisateurs
    () => prisma.profile.deleteMany(),
    () => prisma.passwordReset.deleteMany(),
    () => prisma.verificationToken.deleteMany(),
    () => prisma.session.deleteMany(),
    () => prisma.account.deleteMany(),
    () => prisma.user.deleteMany(),
  ]
  
  for (const operation of cleanupOperations) {
    try {
      await operation()
    } catch (error) {
      // Ignorer les erreurs de suppression pour les tables qui n'existent pas encore
      console.log('Cleanup operation failed (expected):', error.message?.slice(0, 100))
    }
  }
  
  console.log('Database cleanup completed')
} 