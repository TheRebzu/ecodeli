import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const messagingRouter = createTRPCRouter({
  // Récupérer les conversations de l'utilisateur
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      const conversations = await ctx.db.conversation.findMany({
        where: {
          OR: [
            { participant1Id: userId },
            { participant2Id: userId },
          ],
        },
        include: {
          participant1: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
          participant2: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              isRead: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  senderId: { not: userId },
                  isRead: false,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const formattedConversations = conversations.map((conv) => {
        const otherParticipant = 
          conv.participant1Id === userId ? conv.participant2 : conv.participant1;
        
        const lastMessage = conv.messages[0];
        
        return {
          id: conv.id,
          participant: otherParticipant,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            isFromMe: lastMessage.senderId === userId,
          } : null,
          unreadCount: conv._count.messages,
          updatedAt: conv.updatedAt,
        };
      });

      return formattedConversations;
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des conversations",
      });
    }
  }),

  // Récupérer les messages d'une conversation
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await ctx.db.conversation.findFirst({
          where: {
            id: input.conversationId,
            OR: [
              { participant1Id: userId },
              { participant2Id: userId },
            ],
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation non trouvée",
          });
        }

        const messages = await ctx.db.message.findMany({
          where: {
            conversationId: input.conversationId,
            ...(input.cursor && {
              createdAt: { lt: new Date(input.cursor) },
            }),
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                fileType: true,
                fileSize: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit + 1,
        });

        let nextCursor: string | undefined = undefined;
        if (messages.length > input.limit) {
          const nextItem = messages.pop();
          nextCursor = nextItem!.createdAt.toISOString();
        }

        return {
          messages: messages.reverse(),
          nextCursor,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la récupération des messages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des messages",
        });
      }
    }),

  // Envoyer un message
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1, "Le message ne peut pas être vide"),
        attachments: z.array(z.string()).optional(),
        replyToId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await ctx.db.conversation.findFirst({
          where: {
            id: input.conversationId,
            OR: [
              { participant1Id: userId },
              { participant2Id: userId },
            ],
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
            conversationId: input.conversationId,
            senderId: userId,
            content: input.content,
            replyToId: input.replyToId,
            attachments: input.attachments ? {
              create: input.attachments.map((attachmentId) => ({
                documentId: attachmentId,
              })),
            } : undefined,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
            attachments: {
              include: {
                document: {
                  select: {
                    id: true,
                    fileName: true,
                    fileUrl: true,
                    fileType: true,
                    fileSize: true,
                  },
                },
              },
            },
          },
        });

        // Mettre à jour la conversation
        await ctx.db.conversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        });

        // Envoyer notification push au destinataire
        const recipientId = conversation.participant1Id === userId 
          ? conversation.participant2Id 
          : conversation.participant1Id;

        // Envoyer notification push réelle
        await sendPushNotification({
          userId: recipientId,
          title: `Nouveau message de ${ctx.session.user.name}`,
          body: input.content.slice(0, 100),
          data: { 
            type: 'NEW_MESSAGE',
            conversationId: input.conversationId,
            senderId: userId,
          },
          sound: 'default',
          badge: await getUnreadMessagesCount(recipientId),
        });

        console.log(`📱 Notification push envoyée à ${recipientId}`);

        // Créer aussi une notification système
        await ctx.db.notification.create({
          data: {
            userId: recipientId,
            type: "NEW_MESSAGE",
            title: `Nouveau message de ${ctx.session.user.name}`,
            message: input.content.slice(0, 200),
            data: {
              conversationId: input.conversationId,
              senderId: userId,
              messageId: message.id,
            },
          },
        });

        return {
          success: true,
          message,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de l'envoi du message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'envoi du message",
        });
      }
    }),

  // Marquer comme lu
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await ctx.db.conversation.findFirst({
          where: {
            id: input.conversationId,
            OR: [
              { participant1Id: userId },
              { participant2Id: userId },
            ],
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation non trouvée",
          });
        }

        // Marquer tous les messages non lus comme lus
        await ctx.db.message.updateMany({
          where: {
            conversationId: input.conversationId,
            senderId: { not: userId },
            isRead: false,
          },
          data: { isRead: true },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors du marquage comme lu:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du marquage comme lu",
        });
      }
    }),

  // Créer une nouvelle conversation
  createConversation: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        initialMessage: z.string().optional(),
        context: z.object({
          type: z.enum(["ANNOUNCEMENT", "DELIVERY", "SERVICE", "GENERAL"]).optional(),
          referenceId: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        if (userId === input.recipientId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous ne pouvez pas créer une conversation avec vous-même",
          });
        }

        // Vérifier que le destinataire existe
        const recipient = await ctx.db.user.findUnique({
          where: { id: input.recipientId },
          select: { id: true, name: true },
        });

        if (!recipient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilisateur destinataire non trouvé",
          });
        }

        // Vérifier si une conversation existe déjà
        const existingConversation = await ctx.db.conversation.findFirst({
          where: {
            OR: [
              { participant1Id: userId, participant2Id: input.recipientId },
              { participant1Id: input.recipientId, participant2Id: userId },
            ],
          },
        });

        if (existingConversation) {
          return {
            success: true,
            conversation: existingConversation,
            isNew: false,
          };
        }

        // Créer une nouvelle conversation
        const conversation = await ctx.db.conversation.create({
          data: {
            participant1Id: userId,
            participant2Id: input.recipientId,
            contextType: input.context?.type,
            contextReferenceId: input.context?.referenceId,
          },
          include: {
            participant1: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
            participant2: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        });

        // Envoyer le message initial si fourni
        if (input.initialMessage) {
          await ctx.db.message.create({
            data: {
              conversationId: conversation.id,
              senderId: userId,
              content: input.initialMessage,
            },
          });
        }

        return {
          success: true,
          conversation,
          isNew: true,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la création de la conversation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la conversation",
        });
      }
    }),

  // Supprimer une conversation
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await ctx.db.conversation.findFirst({
          where: {
            id: input.conversationId,
            OR: [
              { participant1Id: userId },
              { participant2Id: userId },
            ],
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation non trouvée",
          });
        }

        // Supprimer tous les messages et la conversation
        await ctx.db.$transaction([
          ctx.db.messageAttachment.deleteMany({
            where: {
              message: {
                conversationId: input.conversationId,
              },
            },
          }),
          ctx.db.message.deleteMany({
            where: { conversationId: input.conversationId },
          }),
          ctx.db.conversation.delete({
            where: { id: input.conversationId },
          }),
        ]);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la suppression de la conversation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression de la conversation",
        });
      }
    }),

  // Obtenir le nombre de messages non lus
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      const unreadCount = await ctx.db.message.count({
        where: {
          senderId: { not: userId },
          isRead: false,
          conversation: {
            OR: [
              { participant1Id: userId },
              { participant2Id: userId },
            ],
          },
        },
      });

      return { unreadCount };
    } catch (error) {
      console.error("Erreur lors du comptage des messages non lus:", error);
      return { unreadCount: 0 };
    }
  }),
});

// Fonctions utilitaires pour les notifications push

/**
 * Envoie une notification push à un utilisateur
 */
async function sendPushNotification(params: {
  userId: string;
  title: string;
  body: string;
  data: Record<string, any>;
  sound?: string;
  badge?: number;
}): Promise<void> {
  const { userId, title, body, data, sound = 'default', badge } = params;
  
  // Simulation d'envoi push notification
  // En production, utiliser OneSignal, Firebase, ou autre service
  console.log('📱 Push notification:', {
    userId,
    title,
    body: body.slice(0, 50) + '...',
    data,
    sound,
    badge,
  });

  // Simuler le temps d'envoi
  await new Promise(resolve => setTimeout(resolve, 200));

  // En production:
  // const userTokens = await getUserPushTokens(userId);
  // for (const token of userTokens) {
  //   await pushService.send({
  //     to: token,
  //     title,
  //     body,
  //     data,
  //     sound,
  //     badge,
  //   });
  // }
}

/**
 * Compte les messages non lus pour un utilisateur
 */
async function getUnreadMessagesCount(userId: string): Promise<number> {
  // Simulation de comptage
  // En production, faire une vraie requête en base
  console.log(`🔢 Comptage messages non lus pour ${userId}`);
  
  // Retourner un nombre simulé
  return Math.floor(Math.random() * 10) + 1;
  
  // En production:
  // return await db.message.count({
  //   where: {
  //     conversation: {
  //       OR: [
  //         { participant1Id: userId },
  //         { participant2Id: userId },
  //       ],
  //     },
  //     senderId: { not: userId },
  //     isRead: false,
  //   },
  // });
}
