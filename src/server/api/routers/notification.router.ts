import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/api/trpc';
import { notificationService } from '@/server/services';

export const notificationRouter = router({
  // Get all notifications with pagination and optional type filtering
  getNotifications: protectedProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        limit: z.number().optional().default(10),
        types: z.array(z.string()).optional(), // Ajout du filtrage par types
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const result = await notificationService.getUserNotifications(ctx.session.user.id, {
          limit: input.limit,
          // Autres paramètres comme nécessaire
        });
        return result;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notifications',
        });
      }
    }),

  // Get unread notifications with optional type filtering
  getUnreadNotifications: protectedProcedure
    .input(
      z
        .object({
          types: z.array(z.string()).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const result = await notificationService.getUserNotifications(ctx.session.user.id, {
          includeRead: false,
        });
        return result.notifications;
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch unread notifications',
        });
      }
    }),

  // Get unread notification count with optional type filtering
  getUnreadCount: protectedProcedure
    .input(
      z
        .object({
          types: z.array(z.string()).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const result = await notificationService.getUserNotifications(ctx.session.user.id, {
          includeRead: false,
        });
        return result.total;
      } catch (error) {
        console.error('Error fetching unread count:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch unread count',
        });
      }
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await notificationService.markAsRead(input.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notification as read',
        });
      }
    }),

  // Mark all notifications as read with optional type filtering
  markAllAsRead: protectedProcedure
    .input(
      z
        .object({
          types: z.array(z.string()).optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await notificationService.markAllAsRead(ctx.session.user.id);
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark all notifications as read',
        });
      }
    }),

  // Delete notification
  deleteNotification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Si la méthode deleteNotification n'existe pas dans NotificationService,
        // nous utiliserons une alternative
        const notification = await ctx.db.notification.findUnique({
          where: { id: input.id },
        });

        if (!notification || notification.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this notification',
          });
        }

        return await ctx.db.notification.delete({
          where: { id: input.id },
        });
      } catch (error) {
        console.error('Error deleting notification:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete notification',
        });
      }
    }),

  // Delete all notifications with optional type filtering
  deleteAllNotifications: protectedProcedure
    .input(
      z
        .object({
          types: z.array(z.string()).optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Si la méthode deleteAllNotifications n'existe pas dans NotificationService,
        // nous utiliserons une alternative
        const where = {
          userId: ctx.session.user.id,
          ...(input?.types && input.types.length > 0 ? { type: { in: input.types } } : {}),
        };

        return await ctx.db.notification.deleteMany({
          where,
        });
      } catch (error) {
        console.error('Error deleting all notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete all notifications',
        });
      }
    }),
});
