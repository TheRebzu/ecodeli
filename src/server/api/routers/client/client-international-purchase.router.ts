import { z } from "zod";
import { router as router, protectedProcedure } from "@/server/api/trpc";

// Service d'achat à l'étranger
export const clientInternationalPurchaseRouter = router({ createRequest: protectedProcedure
    .input(
      z.object({
        product: z.string(),
        country: z.string(),
        description: z.string() }),
    )
    .mutation(async ({ input  }) => {
      // Créer une demande d'achat international
      return { success };
    })});
