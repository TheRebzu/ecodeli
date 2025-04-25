import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { verifyVerificationToken } from "@/lib/tokens";

export const verifyEmailRouter = createTRPCRouter({
  verify: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await verifyVerificationToken(input.token);

      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le token de vérification est invalide ou a expiré",
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilisateur non trouvé",
        });
      }

      return {
        success: true,
        message: "Votre adresse email a été vérifiée avec succès",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),
});
