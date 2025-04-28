import { router, protectedProcedure } from '@/server/api/trpc';
import { userPreferencesService } from '@/server/services/user-preferences.service';
import { updateUserPreferencesSchema } from '@/schemas/user-preferences.schema';

export const userPreferencesRouter = router({
  getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
    return userPreferencesService.getUserPreferences(ctx.session.user.id);
  }),

  updateUserPreferences: protectedProcedure
    .input(updateUserPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      return userPreferencesService.updateUserPreferences(ctx.session.user.id, input);
    }),
});
