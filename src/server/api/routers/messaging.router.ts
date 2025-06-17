import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export const messagingRouter = createTRPCRouter({
  // Récupérer les conversations de l'utilisateur
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { userId1: userId },
          { userId2: userId }
        ]
      },
      include: {
        user1: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        },
        user2: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            isRead: true,
            senderId: true
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: userId }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return conversations.map((conv: any) => ({
      id: conv.id,
      otherUser: conv.userId1 === userId ? conv.user2 : conv.user1,
      lastMessage: conv.messages[0] || null,
      unreadCount: conv._count.messages,
      updatedAt: conv.updatedAt
    }));
  }),

  // Récupérer les messages d'une conversation
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier que l'utilisateur fait partie de cette conversation
      const conversation = await db.conversation.findFirst({
        where: {
          id: input.conversationId,
          OR: [
            { userId1: userId },
            { userId2: userId }
          ]
        }
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation non trouvée"
        });
      }

      const messages = await db.message.findMany({
        where: { conversationId: input.conversationId },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true
                }
              }
            }
          },
          attachments: true
        },
        orderBy: { createdAt: "asc" }
      });

      return messages;
    }),

  // Envoyer un message
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1, "Le message ne peut pas être vide"),
        attachments: z.array(z.string()).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier que l'utilisateur fait partie de cette conversation
      const conversation = await db.conversation.findFirst({
        where: {
          id: input.conversationId,
          OR: [
            { userId1: userId },
            { userId2: userId }
          ]
        }
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation non trouvée"
        });
      }

      // Créer le message
      const message = await db.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: userId,
          content: input.content,
          isRead: false,
          attachments: input.attachments ? {
            create: input.attachments.map(url => ({
              url,
              type: "FILE", // Déterminé selon l'extension
              name: url.split('/').pop() || "Fichier"
            }))
          } : undefined
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true
                }
              }
            }
          },
          attachments: true
        }
      });

      // Mettre à jour la date de dernière activité de la conversation
      await db.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() }
      });

      return { success: true, message };
    }),

  // Marquer comme lu
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Marquer tous les messages non lus de cette conversation comme lus
      await db.message.updateMany({
        where: {
          conversationId: input.conversationId,
          senderId: { not: userId },
          isRead: false
        },
        data: { isRead: true }
      });

      return { success: true };
    }),

  // Créer une nouvelle conversation
  createConversation: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        initialMessage: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      if (userId === input.recipientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous ne pouvez pas créer une conversation avec vous-même"
        });
      }

      // Vérifier que le destinataire existe
      const recipient = await db.user.findUnique({
        where: { id: input.recipientId }
      });

      if (!recipient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilisateur non trouvé"
        });
      }

      // Vérifier si une conversation existe déjà
      const existingConversation = await db.conversation.findFirst({
        where: {
          OR: [
            { userId1: userId, userId2: input.recipientId },
            { userId1: input.recipientId, userId2: userId }
          ]
        }
      });

      if (existingConversation) {
        return { 
          success: true, 
          conversationId: existingConversation.id,
          isNew: false 
        };
      }

      // Créer une nouvelle conversation
      const conversation = await db.conversation.create({
        data: {
          userId1: userId,
          userId2: input.recipientId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Envoyer le message initial si fourni
      if (input.initialMessage) {
        await db.message.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            content: input.initialMessage,
            isRead: false
          }
        });
      }

      return { 
        success: true, 
        conversationId: conversation.id,
        isNew: true 
      };
    })
});
