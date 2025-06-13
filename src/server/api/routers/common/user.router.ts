import { router, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { userService } from "@/server/services/common/user.service";
import { toggleUserActivationSchema } from "@/schemas/user/user-activation.schema";
import { TRPCError } from "@trpc/server";
import { userBanSchema } from "@/schemas/user/user-ban.schema";
import { UserBanAction } from "@/types/users/verification";

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ _ctx }) => {
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
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        // Autres champs de profil
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      // Mise à jour du profil
      return {
        id: ctx.session.user.id,
        ...input,
        // Autres champs fictifs
      };
    }),

  /**
   * Permet d'activer/désactiver un compte utilisateur
   */
  toggleActivation: protectedProcedure
    .input(toggleUserActivationSchema)
    .mutation(async ({ input, _ctx }) => {
      // Vérification que l'utilisateur est admin
      if (_ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Accès non autorisé. Seuls les administrateurs peuvent modifier l'état des comptes.",
        });
      }

      const { userId: _userId, isActive: _isActive } = input;
      return userService.toggleUserActivation(userId, isActive);
    }),

  /**
   * Bannir ou débannir un utilisateur (admin uniquement)
   */
  banOrUnban: protectedProcedure
    .input(userBanSchema)
    .mutation(async ({ input, _ctx }) => {
      if (_ctx.session.user.role !== "ADMIN") {
        throw new Error("Permission refusée : admin requis");
      }
      const { userId: _userId, action: _action, reason: _reason } = input;
      return userService.banOrUnbanUser(
        userId,
        action as UserBanAction,
        reason,
        _ctx.session.user.id,
      );
    }),
});
