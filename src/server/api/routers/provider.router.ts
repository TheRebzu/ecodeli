import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// Définir les interfaces pour les données
interface ServiceData {
  id: string;
  providerId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  createdAt?: Date;
}

interface AppointmentWithRelations {
  id: string;
  providerId: string;
  clientId: string;
  serviceId: string;
  date: Date;
  status: string;
  client?: {
    user?: {
      name?: string | null;
    } | null;
  } | null;
  service?: {
    name?: string | null;
    duration?: number | null;
  } | null;
}

export const providerRouter = router({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: {
          provider: true,
        },
      });
      
      if (!user || !user.provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil prestataire non trouvé',
        });
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        description: user.provider.description,
        serviceType: user.provider.serviceType,
        isVerified: user.provider.isVerified,
        rating: user.provider.rating,
        createdAt: user.createdAt
      };
    }),
  
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phoneNumber: z.string().optional(),
      description: z.string().optional(),
      serviceType: z.string().optional(),
      availability: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { provider: true },
      });
      
      if (!user || !user.provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à mettre à jour ce profil',
        });
      }
      
      // Extraire les données à mettre à jour
      const { name, phoneNumber, ...providerData } = input;
      
      // Mise à jour des données utilisateur
      if (name || phoneNumber) {
        await ctx.db.user.update({
          where: { id: userId },
          data: {
            name: name || undefined,
            phoneNumber: phoneNumber || undefined,
          },
        });
      }
      
      // Mise à jour des données prestataire
      if (Object.keys(providerData).length > 0) {
        await ctx.db.provider.update({
          where: { userId },
          data: providerData,
        });
      }
      
      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { provider: true },
      });
      
      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        phoneNumber: updatedUser?.phoneNumber,
        description: updatedUser?.provider?.description,
        serviceType: updatedUser?.provider?.serviceType,
        updated: true
      };
    }),
  
  getServices: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { provider: true },
      });
      
      if (!user || !user.provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à accéder à ces données',
        });
      }
      
      // Récupérer les services
      const services = await ctx.db.service.findMany({
        where: {
          providerId: user.provider.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return services.map((service: ServiceData) => ({
        id: service.id,
        providerId: service.providerId,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: service.category
      }));
    }),
    
  createService: protectedProcedure
    .input(z.object({
      name: z.string().min(3),
      description: z.string().min(10),
      price: z.number().positive(),
      duration: z.number().int().positive(),
      category: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { provider: true },
      });
      
      if (!user || !user.provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à créer un service',
        });
      }
      
      // Créer le service
      const service = await ctx.db.service.create({
        data: {
          providerId: user.provider.id,
          name: input.name,
          description: input.description,
          price: input.price,
          duration: input.duration,
          category: input.category,
          isActive: true
        },
      });
      
      return {
        id: service.id,
        providerId: service.providerId,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: service.category,
        createdAt: service.createdAt.toISOString()
      };
    }),
    
  getAppointments: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { provider: true },
      });
      
      if (!user || !user.provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à accéder à ces données',
        });
      }
      
      // Récupérer les rendez-vous
      const appointments = await ctx.db.appointment.findMany({
        where: {
          providerId: user.provider.id,
        },
        include: {
          client: {
            include: {
              user: true
            }
          },
          service: true
        },
        orderBy: {
          date: 'asc',
        },
      });
      
      return appointments.map((appointment: AppointmentWithRelations) => ({
        id: appointment.id,
        providerId: appointment.providerId,
        clientId: appointment.clientId,
        clientName: appointment.client?.user?.name || 'Client inconnu',
        serviceId: appointment.serviceId,
        serviceName: appointment.service?.name || 'Service inconnu',
        status: appointment.status,
        date: appointment.date.toISOString(),
        duration: appointment.service?.duration || 0
      }));
    })
}); 