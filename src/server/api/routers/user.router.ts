import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const userRouter = router({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      // Récupération du profil utilisateur
      return {
        id: ctx.session.user.id,
        name: ctx.session.user.name,
        email: ctx.session.user.email,
        role: ctx.session.user.role,
        // Autres champs fictifs
      };
    }),
  
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      // Autres champs de profil
    }))
    .mutation(async ({ ctx, input }) => {
      // Mise à jour du profil
      return {
        id: ctx.session.user.id,
        ...input,
        // Autres champs fictifs
      };
    }),
});