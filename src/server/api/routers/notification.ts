import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, clientProcedure, merchantProcedure, delivererProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const notificationRouter = router({
  // Get unread notifications for the current user
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    
    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    return await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }),

  // Get all notifications for the current user with pagination
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      const { limit, cursor } = input;
      
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      let nextCursor: typeof cursor = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }
      
      return {
        notifications,
        nextCursor,
      };
    }),

  // Mark a notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      const notification = await prisma.notification.findUnique({
        where: { id: input.id },
      });
      
      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }
      
      if (notification.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to mark this notification as read',
        });
      }
      
      return await prisma.notification.update({
        where: { id: input.id },
        data: { isRead: true },
      });
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    
    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }),

  // Delete a notification
  deleteNotification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      const notification = await prisma.notification.findUnique({
        where: { id: input.id },
      });
      
      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }
      
      if (notification.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this notification',
        });
      }
      
      return await prisma.notification.delete({
        where: { id: input.id },
      });
    }),

  // Get user notification preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    
    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }
    
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });
    
    if (!preferences) {
      // Create default preferences if they don't exist
      return await prisma.notificationPreference.create({
        data: {
          userId,
          email: true,
          push: true,
          announcements: true,
          deliveries: true,
          messages: true,
          marketing: false,
        },
      });
    }
    
    return preferences;
  }),

  // Update notification preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        announcements: z.boolean().optional(),
        deliveries: z.boolean().optional(),
        messages: z.boolean().optional(),
        marketing: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });
      
      if (!preferences) {
        // Create preferences if they don't exist
        return await prisma.notificationPreference.create({
          data: {
            userId,
            ...input,
          },
        });
      }
      
      // Update existing preferences
      return await prisma.notificationPreference.update({
        where: { userId },
        data: input,
      });
    }),

  // Register device for push notifications
  registerDevice: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(['WEB', 'IOS', 'ANDROID']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      const { token, platform } = input;
      
      // Check if device already exists
      const existingDevice = await prisma.pushSubscription.findFirst({
        where: {
          token,
          userId,
        },
      });
      
      if (existingDevice) {
        // Update last active time
        return await prisma.pushSubscription.update({
          where: { id: existingDevice.id },
          data: {
            lastActiveAt: new Date(),
          },
        });
      }
      
      // Create new device subscription
      return await prisma.pushSubscription.create({
        data: {
          userId,
          token,
          platform,
          lastActiveAt: new Date(),
        },
      });
    }),

  // Unregister device from push notifications
  unregisterDevice: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      const device = await prisma.pushSubscription.findFirst({
        where: {
          token: input.token,
          userId,
        },
      });
      
      if (!device) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Device not found',
        });
      }
      
      return await prisma.pushSubscription.delete({
        where: { id: device.id },
      });
    }),

  // Admin: Send notification to a specific user
  sendToUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string().min(1),
        body: z.string().min(1),
        type: z.enum(['ANNOUNCEMENT', 'DELIVERY', 'MESSAGE', 'SYSTEM']).default('SYSTEM'),
        data: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, title, body, type, data } = input;
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      
      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          body,
          type,
          data: data || {},
        },
      });
      
      // Get user's devices
      const devices = await prisma.pushSubscription.findMany({
        where: {
          userId,
        },
      });
      
      // Get user's preferences
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });
      
      const shouldSendPush = !preferences || 
        (preferences.push && 
          ((type === 'ANNOUNCEMENT' && preferences.announcements) ||
           (type === 'DELIVERY' && preferences.deliveries) ||
           (type === 'MESSAGE' && preferences.messages) ||
           (type === 'SYSTEM')));
      
      // If they have push enabled and have devices, send push notifications
      // In a real implementation, you would integrate with OneSignal or another push service here
      if (shouldSendPush && devices.length > 0) {
        // This would be where you'd call your push notification service
        // For example with OneSignal:
        // await sendOneSignalNotification({ 
        //   playerIds: devices.map(d => d.token), 
        //   title, 
        //   body,
        //   data
        // });
        
        // For now, just log that we would send a push
        console.log(`Would send push notification to ${devices.length} devices for user ${userId}`);
      }
      
      return notification;
    }),

  // Admin: Send notification to all users with a specific role
  sendToRole: adminProcedure
    .input(
      z.object({
        role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER']),
        title: z.string().min(1),
        body: z.string().min(1),
        type: z.enum(['ANNOUNCEMENT', 'DELIVERY', 'MESSAGE', 'SYSTEM']).default('SYSTEM'),
        data: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { role, title, body, type, data } = input;
      
      // Get all users with the specified role
      const users = await prisma.user.findMany({
        where: { role },
        select: { id: true },
      });
      
      if (users.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No users found with role ${role}`,
        });
      }
      
      // Create notifications for all users
      await prisma.notification.createMany({
        data: users.map(user => ({
          userId: user.id,
          title,
          body,
          type,
          data: data || {},
        })),
      });
      
      // In a real implementation, you would batch push notifications
      // to all relevant devices through your push notification service
      
      return { success: true, userCount: users.length };
    }),
}); 