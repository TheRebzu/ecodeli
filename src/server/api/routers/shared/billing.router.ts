import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";

export const billingRouter = createTRPCRouter({
  // Endpoints de facturation pour admin uniquement
  getSystemBilling: adminProcedure.query(async ({ _ctx }) => {
    // TODO: Implémenter la récupération de la facturation système
    return {
      totalRevenue: 0,
      pendingPayments: 0,
      commissions: 0,
    };
  }),

  generateSystemReport: adminProcedure
    .input(
      z.object({
        period: z.enum(["month", "quarter", "year"]),
        year: z.number(),
        month: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // TODO: Implémenter la génération de rapport système
      return { reportId: "temp-id", status: "generated" };
    }),
});
