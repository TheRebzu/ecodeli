import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const messagingRouter = createTRPCRouter({
  // Récupérer les conversations de l'utilisateur
  getConversations: protectedProcedure.query(async ({ ctx: _ctx }) => {
    // TODO: Implémenter la récupération des conversations
    return [];
  }),

  // Récupérer les messages d'une conversation
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx: _ctx, input: _input }) => {
      // TODO: Implémenter la récupération des messages
      return [];
    }),

  // Envoyer un message
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string(),
        attachments: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // TODO: Implémenter l'envoi de message
      return { success: true };
    }),

  // Marquer comme lu
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // TODO: Implémenter le marquage comme lu
      return { success: true };
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
