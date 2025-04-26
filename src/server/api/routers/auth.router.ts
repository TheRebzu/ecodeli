import { router, publicProcedure, protectedProcedure } from "../trpc";
import { AuthService } from "../../services/auth.service";
import { 
  loginSchema, 
  clientRegisterSchema,
  delivererRegisterSchema,
  merchantRegisterSchema,
  providerRegisterSchema,
  verifyEmailSchema,
  forgotPasswordSchema, 
  resetPasswordSchema,
} from "../../../schemas/auth/user.schema";
import { TRPCError } from "@trpc/server";

const authService = new AuthService();

export const authRouter = router({
  // Inscription d'un client
  registerClient: publicProcedure
    .input(clientRegisterSchema)
    .mutation(async ({ input }) => {
      return await authService.registerClient(input);
    }),

  // Inscription d'un livreur
  registerDeliverer: publicProcedure
    .input(delivererRegisterSchema)
    .mutation(async ({ input }) => {
      return await authService.registerDeliverer(input);
    }),
  
  // Inscription d'un commerçant
  registerMerchant: publicProcedure
    .input(merchantRegisterSchema)
    .mutation(async ({ input }) => {
      return await authService.registerMerchant(input);
    }),
  
  // Inscription d'un prestataire
  registerProvider: publicProcedure
    .input(providerRegisterSchema)
    .mutation(async ({ input }) => {
      return await authService.registerProvider(input);
    }),
  
  // Vérification d'email
  verifyEmail: publicProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ input }) => {
      return await authService.verifyEmail(input.token);
    }),
  
  // Demande de réinitialisation de mot de passe
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ input }) => {
      return await authService.forgotPassword(input.email);
    }),
  
  // Réinitialisation de mot de passe
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      return await authService.resetPassword(input.token, input.password);
    }),
  
  // Obtenir l'utilisateur actuel (session)
  getSession: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
        name: true,
          email: true,
          role: true,
        status: true,
        image: true,
          emailVerified: true,
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
        admin: true,
        },
      });
      
      if (!user) {
        throw new TRPCError({
        code: "NOT_FOUND",
        message: "Utilisateur non trouvé",
        });
      }
      
      return user;
    }),
});