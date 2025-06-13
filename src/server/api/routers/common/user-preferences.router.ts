import { router, protectedProcedure } from "@/server/api/trpc";
import { userPreferencesService } from "@/server/services/common/user-preferences.service";
import {
  updateUserPreferencesSchema,
  updateOnboardingStatusSchema,
} from "@/schemas/user/user-preferences.schema";

export const userPreferencesRouter = router({
  getUserPreferences: protectedProcedure.query(async ({ _ctx }) => {
    return userPreferencesService.getUserPreferences(_ctx.session.user.id);
  }),

  updateUserPreferences: protectedProcedure
    .input(updateUserPreferencesSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      return userPreferencesService.updateUserPreferences(
        _ctx.session.user.id,
        input,
      );
    }),

  updatePreferences: protectedProcedure
    .input(updateUserPreferencesSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      return userPreferencesService.updateUserPreferences(
        _ctx.session.user.id,
        input,
      );
    }),

  getOnboardingStatus: protectedProcedure.query(async ({ _ctx }) => {
    return userPreferencesService.getOnboardingStatus(_ctx.session.user.id);
  }),

  updateOnboardingStatus: protectedProcedure
    .input(updateOnboardingStatusSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      return userPreferencesService.updateOnboardingStatus(
        _ctx.session.user.id,
        input,
      );
    }),

  resetOnboardingStatus: protectedProcedure.mutation(async ({ _ctx }) => {
    return userPreferencesService.resetOnboardingStatus(_ctx.session.user.id);
  }),
});
