import { z } from 'zod';
import { router, protectedProcedure, providerProcedure, clientProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const providerRouter = router({
  createService: providerProcedure
    .input(
      z.object({
        title: z.string().min(3).max(100),
        description: z.string().min(10).max(500),
        category: z.enum(['TRANSPORT', 'HOUSEWORK', 'SHOPPING', 'OTHER']),
        price: z.number().positive(),
        duration: z.number().int().positive(), // Duration in minutes
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const providerId = ctx.session.user.id;
      
      const service = await prisma.service.create({
        data: {
          ...input,
          providerId,
          status: 'ACTIVE',
        },
      });
      
      return service;
    }),
    
  updateService: providerProcedure
    .input(
      z.object({
        serviceId: z.string(),
        title: z.string().min(3).max(100).optional(),
        description: z.string().min(10).max(500).optional(),
        category: z.enum(['TRANSPORT', 'HOUSEWORK', 'SHOPPING', 'OTHER']).optional(),
        price: z.number().positive().optional(),
        duration: z.number().int().positive().optional(),
        imageUrl: z.string().url().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const providerId = ctx.session.user.id;
      const { serviceId, ...updateData } = input;
      
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      
      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service not found',
        });
      }
      
      if (service.providerId !== providerId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this service',
        });
      }
      
      const updatedService = await prisma.service.update({
        where: { id: serviceId },
        data: updateData,
      });
      
      return updatedService;
    }),
    
  getServiceById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;
      
      const service = await prisma.service.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
      
      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service not found',
        });
      }
      
      return service;
    }),
    
  getMyServices: providerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().nullish(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const providerId = ctx.session.user.id;
      const { limit, cursor, status } = input;
      
      const items = await prisma.service.findMany({
        take: limit + 1,
        where: {
          providerId,
          ...(status ? { status } : {}),
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      let nextCursor: typeof cursor = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }
      
      return {
        items,
        nextCursor,
      };
    }),
    
  bookService: clientProcedure
    .input(
      z.object({
        serviceId: z.string(),
        date: z.date(),
        time: z.string(), // Format: HH:MM
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = ctx.session.user.id;
      const { serviceId, date, time, notes } = input;
      
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      
      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service not found',
        });
      }
      
      if (service.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This service is not available for booking',
        });
      }
      
      // Parse date and time to create a datetime
      const [hours, minutes] = time.split(':').map(Number);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      // Validate that the appointment is in the future
      if (appointmentDate <= new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Appointment must be in the future',
        });
      }
      
      // Check if provider is available at this time
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          providerId: service.providerId,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          startTime: { lte: appointmentDate },
          endTime: { gte: appointmentDate },
        },
      });
      
      if (conflictingAppointment) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Provider is not available at this time',
        });
      }
      
      // Calculate end time based on service duration
      const endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + service.duration);
      
      const appointment = await prisma.appointment.create({
        data: {
          serviceId,
          clientId,
          providerId: service.providerId,
          startTime: appointmentDate,
          endTime,
          status: 'SCHEDULED',
          notes,
          price: service.price,
        },
      });
      
      return appointment;
    }),
    
  getProviderAppointments: providerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().nullish(),
        status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
        date: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const providerId = ctx.session.user.id;
      const { limit, cursor, status, date } = input;
      
      let dateFilter = {};
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        dateFilter = {
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        };
      }
      
      const items = await prisma.appointment.findMany({
        take: limit + 1,
        where: {
          providerId,
          ...(status ? { status } : {}),
          ...dateFilter,
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          startTime: 'asc',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          service: true,
        },
      });
      
      let nextCursor: typeof cursor = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }
      
      return {
        items,
        nextCursor,
      };
    }),
    
  confirmAppointment: providerProcedure
    .input(z.object({ appointmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const providerId = ctx.session.user.id;
      const { appointmentId } = input;
      
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      
      if (!appointment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Appointment not found',
        });
      }
      
      if (appointment.providerId !== providerId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to confirm this appointment',
        });
      }
      
      if (appointment.status !== 'SCHEDULED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This appointment cannot be confirmed',
        });
      }
      
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' },
      });
      
      return updatedAppointment;
    }),
}); 