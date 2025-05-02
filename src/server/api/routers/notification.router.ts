import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/api/trpc';
import { NotificationService } from '@/server/services/notification.service';

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
        const notificationService = new NotificationService(ctx.db);
        const result = await notificationService.getNotifications(
          ctx.session.user.id,
          input.page,
          input.limit,
          input.types
        );
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
        const notificationService = new NotificationService(ctx.db);
        return await notificationService.getUnreadNotifications(ctx.session.user.id, input?.types);
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
        const notificationService = new NotificationService(ctx.db);
        const unreadNotifications = await notificationService.getUnreadNotifications(
          ctx.session.user.id,
          input?.types
        );
        return unreadNotifications.length;
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
        const notificationService = new NotificationService(ctx.db);
        return await notificationService.markAsRead(input.id, ctx.session.user.id);
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
        const notificationService = new NotificationService(ctx.db);
        return await notificationService.markAllAsRead(ctx.session.user.id, input?.types);
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
        const notificationService = new NotificationService(ctx.db);
        return await notificationService.deleteNotification(input.id, ctx.session.user.id);
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
        const notificationService = new NotificationService(ctx.db);
        return await notificationService.deleteAllNotifications(ctx.session.user.id, input?.types);
      } catch (error) {
        console.error('Error deleting all notifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete all notifications',
        });
      }
    }),
});
