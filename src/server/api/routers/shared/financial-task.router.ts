import { router, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { financialTaskService } from "@/server/services/shared/financial-task.service";
import {
  createFinancialTaskSchema,
  updateFinancialTaskSchema,
  toggleFinancialTaskSchema,
  deleteFinancialTaskSchema,
  financialTaskListOptionsSchema,
  financialTaskFiltersSchema,
} from "@/schemas/payment/financial-task.schema";

export const financialTaskRouter = router({
  // Récupérer toutes les tâches financières de l'utilisateur (avec filtres et pagination)
  getUserTasks: protectedProcedure
    .input(
      financialTaskListOptionsSchema.optional().default({
        page: 1,
        limit: 10,
        sortField: "createdAt",
        sortDirection: "desc",
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit, sortField, sortDirection, filters } = input;

      return await financialTaskService.getFinancialTasks(
        userId,
        page,
        limit,
        filters,
        {
          field: sortField,
          direction: sortDirection,
        },
      );
    }),

  // Récupérer une tâche financière par ID
  getTaskById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await financialTaskService.getFinancialTaskById(input.id, userId);
    }),

  // Créer une nouvelle tâche financière
  createTask: protectedProcedure
    .input(createFinancialTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await financialTaskService.createFinancialTask(userId, input);
    }),

  // Mettre à jour une tâche financière
  updateTask: protectedProcedure
    .input(updateFinancialTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await financialTaskService.updateFinancialTask(input, userId);
    }),

  // Changer le statut (terminé/non terminé) d'une tâche
  toggleTaskStatus: protectedProcedure
    .input(toggleFinancialTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await financialTaskService.toggleFinancialTaskStatus(
        input.id,
        input.completed,
        userId,
      );
    }),

  // Supprimer une tâche financière
  deleteTask: protectedProcedure
    .input(deleteFinancialTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await financialTaskService.deleteFinancialTask(input.id, userId);
    }),

  // Obtenir des statistiques sur les tâches financières
  getTaskStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await financialTaskService.getFinancialTaskStats(userId);
  }),
});
