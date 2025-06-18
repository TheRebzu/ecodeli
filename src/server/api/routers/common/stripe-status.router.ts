import { router, publicProcedure } from "@/server/api/trpc";
import { checkStripeAvailability } from "@/server/services/shared/stripe.service";

/**
 * Router pour vérifier le statut de Stripe
 */
export const stripeStatusRouter = router({
  /**
   * Vérifie si Stripe est disponible et configuré
   */
  checkStatus: publicProcedure
    .query(async () => {
      return checkStripeAvailability();
    })
}); 