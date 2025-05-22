import { router, protectedProcedure } from '@/server/api/trpc';
import { userPreferencesService } from '@/server/services/user-preferences.service';
import {
  updateUserPreferencesSchema,
  updateOnboardingStatusSchema,
} from '@/schemas/user-preferences.schema';

export const userPreferencesRouter = router({
  getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
    return userPreferencesService.getUserPreferences(ctx.session.user.id);
  }),

  updateUserPreferences: protectedProcedure
    .input(updateUserPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      return userPreferencesService.updateUserPreferences(ctx.session.user.id, input);
    }),

  updatePreferences: protectedProcedure
    .input(updateUserPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      return userPreferencesService.updateUserPreferences(ctx.session.user.id, input);
    }),

  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    return userPreferencesService.getOnboardingStatus(ctx.session.user.id);
  }),

  updateOnboardingStatus: protectedProcedure
    .input(updateOnboardingStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return userPreferencesService.updateOnboardingStatus(ctx.session.user.id, input);
    }),

  resetOnboardingStatus: protectedProcedure.mutation(async ({ ctx }) => {
    return userPreferencesService.resetOnboardingStatus(ctx.session.user.id);
  }),
});
