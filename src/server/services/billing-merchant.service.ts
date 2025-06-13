// Service de facturation pour les commerçants
import { db } from "@/server/db";

export const merchantBillingService = {
  processScheduledMerchantPayments: async () => {
    // Traiter les paiements programmés des marchands
    try {
      // Récupérer les abonnements actifs avec paiements dus
      const dueSubscriptions = await db.subscription.findMany({
        where: {
          status: "ACTIVE",
          nextPaymentDate: {
            lte: new Date(),
          },
        },
        include: {
          user: {
            include: {
              merchant: true,
            },
          },
        },
      });

      const processed = 0;
      const errors = 0;

      for (const subscription of dueSubscriptions) {
        try {
          // Créer la facture
          const invoice = await db.invoice.create({
            data: {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              type: "SUBSCRIPTION",
              status: "PENDING",
              totalAmount: subscription.priceMonthly,
              issuedDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
              description: `Abonnement ${subscription.planType} - ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
            },
          });

          // Mettre à jour la prochaine date de paiement
          await db.subscription.update({
            where: { id: subscription.id },
            data: {
              nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          processed++;
          console.log(`Facture créée pour l'abonnement ${subscription.id}`);
        } catch (_error) {
          console.error(`Erreur pour l'abonnement ${subscription.id}:`, error);
          errors++;
        }
      }

      return { processed, errors };
    } catch (_error) {
      console.error(
        "Erreur lors du traitement des paiements programmés:",
        error,
      );
      return { processed: 0, errors: 1 };
    }
  },
};
