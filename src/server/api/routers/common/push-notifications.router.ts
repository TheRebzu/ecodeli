import { z } from "zod";
import { router as router,
  protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";

/**
 * Router pour les notifications push
 * Gestion complète des notifications en temps réel
 */
export const pushNotificationsRouter = router({ // Récupérer les notifications de l'utilisateur
  getUserNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const { user } = ctx.session;

        const notifications = await db.notification.findMany({ where: {
            recipientId: user.id,
            ...(input.unreadOnly && { isRead  })},
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true}}}});

        const totalCount = await db.notification.count({ where: {
            recipientId: user.id,
            ...(input.unreadOnly && { isRead  })}});

        return {
          success: true,
          data: {
            notifications,
            totalCount,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des notifications" });
      }
    }),

  // Envoyer une notification push
  sendNotification: protectedProcedure
    .input(
      z.object({ recipientId: z.string(),
        title: z.string().min(1).max(255),
        content: z.string().min(1).max(500),
        type: z.enum([
          "INFO", 
          "WARNING", 
          "ERROR", 
          "SUCCESS", 
          "DELIVERY_UPDATE", 
          "PAYMENT_UPDATE", 
          "ANNOUNCEMENT"
        ]),
        actionUrl: z.string().url().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
        metadata: z.record(z.any()).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const { user } = ctx.session;

        // Vérifier les permissions d'envoi
        if (user.role !== UserRole.ADMIN) {
          // Vérifier si l'utilisateur peut envoyer des notifications au destinataire
          const canSend = await checkSendPermissions(user.id, input.recipientId);
          if (!canSend) {
            throw new TRPCError({ code: "FORBIDDEN",
              message: "Permission refusée pour envoyer cette notification" });
          }
        }

        // Créer la notification en base
        const notification = await db.notification.create({
          data: {
            recipientId: input.recipientId,
            senderId: user.id,
            title: input.title,
            content: input.content,
            type: input.type,
            actionUrl: input.actionUrl,
            priority: input.priority,
            metadata: input.metadata || {},
            isRead: false},
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true}},
            recipient: {
              select: {
                id: true,
                name: true,
                email: true}}}});

        // Envoyer la notification push via OneSignal
        await sendPushNotification(notification);

        return {
          success: true,
          data: notification};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'envoi de la notification" });
      }
    }),

  // Marquer une notification comme lue
  markAsRead: protectedProcedure
    .input(
      z.object({ notificationId: z.string() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const { user } = ctx.session;

        const notification = await db.notification.updateMany({
          where: {
            id: input.notificationId,
            recipientId: user.id},
          data: {
            isRead: true,
            readAt: new Date()}});

        return {
          success: true,
          data: notification};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de la notification" });
      }
    }),

  // Marquer toutes les notifications comme lues
  markAllAsRead: protectedProcedure.mutation(async ({ ctx  }) => {
    try {
      const { user } = ctx.session;

      await db.notification.updateMany({
        where: {
          recipientId: user.id,
          isRead: false},
        data: {
          isRead: true,
          readAt: new Date()}});

      return {
        success: true,
        message: "Toutes les notifications ont été marquées comme lues"};
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la mise à jour des notifications" });
    }
  }),

  // Supprimer une notification
  deleteNotification: protectedProcedure
    .input(
      z.object({ notificationId: z.string() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const { user } = ctx.session;

        await db.notification.deleteMany({
          where: {
            id: input.notificationId,
            recipientId: user.id}});

        return {
          success: true,
          message: "Notification supprimée avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression de la notification" });
      }
    }),

  // Obtenir le nombre de notifications non lues
  getUnreadCount: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const { user } = ctx.session;

      const count = await db.notification.count({
        where: {
          recipientId: user.id,
          isRead: false}});

      return {
        success: true,
        data: { unreadCount }};
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du comptage des notifications" });
    }
  })});

// Fonctions helper
async function checkSendPermissions(senderId: string, recipientId: string): Promise<boolean> {
  // Vérifier les relations entre utilisateurs pour autoriser l'envoi
  const senderUser = await db.user.findUnique({
    where: { id },
    include: {
      deliverer: true,
      merchant: true,
      provider: true}});

  const recipientUser = await db.user.findUnique({
    where: { id },
    include: {
      deliverer: true,
      merchant: true,
      provider: true}});

  if (!senderUser || !recipientUser) return false;

  // Logique d'autorisation selon les rôles
  if (senderUser.role === UserRole.ADMIN) return true;
  
  // Les commerçants peuvent envoyer aux livreurs qui livrent pour eux
  if (senderUser.role === UserRole.MERCHANT && recipientUser.role === UserRole.DELIVERER) {
    return true; // Vérification plus fine selon les contrats
  }

  // Les livreurs peuvent envoyer aux clients et commerçants
  if (senderUser.role === UserRole.DELIVERER) {
    return recipientUser.role === UserRole.CLIENT || recipientUser.role === UserRole.MERCHANT;
  }

  return false;
}

async function sendPushNotification(notification: any): Promise<void> {
  try {
    // Intégration avec OneSignal pour l'envoi réel
    const oneSignalService = await import('@/lib/services/onesignal.service');
    
    await oneSignalService.sendNotification({
      userIds: [notification.recipientId],
      title: notification.title,
      content: notification.content,
      data: {
        notificationId: notification.id,
        type: notification.type,
        actionUrl: notification.actionUrl}});
  } catch (error) {
    console.error('Erreur envoi push notification:', error);
    // Ne pas faire échouer la création de notification si l'envoi push échoue
  }
}
