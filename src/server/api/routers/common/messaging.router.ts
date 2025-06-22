import { router, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const messagingRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    try {
      const conversations = await ctx.db.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: ctx.session.user.id,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              createdAt: true,
              senderId: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  senderId: { not: ctx.session.user.id },
                  readAt: null,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return conversations.map((conv) => ({
        id: conv.id,
        participants: conv.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name || "Utilisateur",
          image: p.user.image,
          role: p.user.role,
        })),
        lastMessage: conv.messages[0] || null,
        unreadCount: conv._count.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des conversations",
      });
    }
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await ctx.db.conversation.findFirst({
          where: {
            id: input.conversationId,
            participants: {
              some: {
                userId: ctx.session.user.id,
              },
            },
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation non trouvée",
          });
        }

        const messages = await ctx.db.message.findMany({
          where: { conversationId: input.conversationId },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        return messages;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la récupération des messages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des messages",
        });
      }
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await ctx.db.conversation.findFirst({
          where: {
            id: input.conversationId,
            participants: {
              some: {
                userId: ctx.session.user.id,
              },
            },
          },
          include: {
            participants: true,
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation non trouvée",
          });
        }

        // Créer le message
        const message = await ctx.db.message.create({
          data: {
            content: input.content,
            senderId: ctx.session.user.id,
            conversationId: input.conversationId,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

        // Mettre à jour la conversation
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        });

        return message;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de l'envoi du message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'envoi du message",
        });
      }
    }),

  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Marquer tous les messages non lus de la conversation comme lus
        await ctx.db.message.updateMany({
          where: {
            conversationId: input.conversationId,
            senderId: { not: ctx.session.user.id },
            readAt: null,
          },
          data: {
            readAt: new Date(),
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Erreur lors du marquage comme lu:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du marquage comme lu",
        });
      }
    }),

  createConversation: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        initialMessage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier si une conversation existe déjà entre ces utilisateurs
        const existingConversation = await ctx.db.conversation.findFirst({
          where: {
            AND: [
              {
                participants: {
                  some: { userId: ctx.session.user.id },
                },
              },
              {
                participants: {
                  some: { userId: input.recipientId },
                },
              },
            ],
          },
        });

        if (existingConversation) {
          return existingConversation;
        }

        // Créer une nouvelle conversation
        const conversation = await ctx.db.conversation.create({
          data: {
            participants: {
              create: [
                { userId: ctx.session.user.id },
                { userId: input.recipientId },
              ],
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    role: true,
                  },
                },
              },
            },
          },
        });

        // Envoyer le message initial si fourni
        if (input.initialMessage) {
          await ctx.db.message.create({
            data: {
              content: input.initialMessage,
              senderId: ctx.session.user.id,
              conversationId: conversation.id,
            },
          });
        }

        return conversation;
      } catch (error) {
        console.error("Erreur lors de la création de la conversation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la conversation",
        });
      }
    }),
});
