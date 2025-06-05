import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { commissionService } from '@/server/services/commission/commission.service';

export const commissionRouter = createTRPCRouter({
  getCommissionRates: protectedProcedure.query(async () => {
    return commissionService.getActiveCommissionRates();
  }),

  updateCommissionRate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        rate: z.number().min(0).max(1),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.commission.update({
        where: { id: input.id },
        data: {
          rate: input.rate,
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
    }),

  createCommissionRate: adminProcedure
    .input(
      z.object({
        rate: z.number().min(0).max(1),
        serviceType: z.string(),
        applicableRoles: z.array(z.string()),
        calculationType: z.enum(['PERCENTAGE', 'FLAT_FEE']).default('PERCENTAGE'),
        flatFee: z.number().optional(),
        minimumAmount: z.number().optional(),
        maximumAmount: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.commission.create({
        data: input,
      });
    }),
});
