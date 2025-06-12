// Service de facturation pour les commerçants
import { db } from '@/server/db';

export const merchantBillingService = {
  processScheduledMerchantPayments: async () => {
    // TODO: Implémenter le traitement des paiements programmés
    console.log('Processing scheduled merchant payments');
    return { processed: 0, errors: 0 };
  },
};
