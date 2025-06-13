import { router, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const messagingRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    // Récupérer les conversations de l'utilisateur
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Récupérer les messages d'une conversation
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Envoyer un message
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        initialMessage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Créer une nouvelle conversation
    }),
});
