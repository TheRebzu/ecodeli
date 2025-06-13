import { router, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const messagingRouter = router({
  getConversations: protectedProcedure.query(async ({ _ctx }) => {
    // Récupérer les conversations de l'utilisateur
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ _ctx, input: _input }) => {
      // Récupérer les messages d'une conversation
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      // Envoyer un message
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        initialMessage: z.string().optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      // Créer une nouvelle conversation
    }),
});
