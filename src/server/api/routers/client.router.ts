import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// Définir les interfaces pour les données récupérées de la base de données
interface DeliveryWithRelations {
  id: string;
  clientId: string;
  status: string;
  originAddress: string;
  destinationAddress: string;
  createdAt: Date;
  estimatedDelivery: Date | null;
  deliveredAt: Date | null;
  merchant?: {
    user?: {
      name?: string | null;
    } | null;
  } | null;
}

interface InvoiceWithRelations {
  id: string;
  clientId: string;
  amount: number;
  status: string;
  createdAt: Date;
  deliveryId: string | null;
}

export const clientRouter = router({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: {
          client: true,
        },
      });
      
      if (!user || !user.client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil client non trouvé',
        });
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.client.address,
        city: user.client.city,
        postalCode: user.client.postalCode,
        country: user.client.country,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      };
    }),
  
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      phoneNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });
      
      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à mettre à jour ce profil',
        });
      }
      
      // Mise à jour des données utilisateur
      const { name, phoneNumber, ...clientData } = input;
      
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
      
      // Mise à jour des données client
      if (Object.keys(clientData).length > 0) {
        await ctx.db.client.update({
          where: { userId },
          data: clientData,
        });
      }
      
      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });
      
      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        address: updatedUser?.client?.address,
        city: updatedUser?.client?.city,
        postalCode: updatedUser?.client?.postalCode,
        country: updatedUser?.client?.country,
        phoneNumber: updatedUser?.phoneNumber,
        updated: true,
      };
    }),
  
  getDeliveries: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });
      
      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à accéder à ces données',
        });
      }
      
      // Récupérer les livraisons
      const deliveries = await ctx.db.delivery.findMany({
        where: {
          clientId: user.client.id,
        },
        include: {
          merchant: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return deliveries.map((delivery: DeliveryWithRelations) => ({
        id: delivery.id,
        clientId: delivery.clientId,
        status: delivery.status,
        merchantName: delivery.merchant?.user?.name || 'Inconnu',
        originAddress: delivery.originAddress,
        destinationAddress: delivery.destinationAddress,
        createdAt: delivery.createdAt.toISOString(),
        estimatedDelivery: delivery.estimatedDelivery?.toISOString(),
        deliveredAt: delivery.deliveredAt?.toISOString(),
      }));
    }),
    
  getInvoices: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });
      
      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à accéder à ces données',
        });
      }
      
      // Récupérer les factures
      const invoices = await ctx.db.invoice.findMany({
        where: {
          clientId: user.client.id,
        },
        include: {
          delivery: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return invoices.map((invoice: InvoiceWithRelations) => ({
        id: invoice.id,
        clientId: invoice.clientId,
        amount: invoice.amount,
        status: invoice.status,
        date: invoice.createdAt.toISOString(),
        deliveryId: invoice.deliveryId,
      }));
    }),
    
  bookService: protectedProcedure
    .input(z.object({
      serviceId: z.string(),
      providerId: z.string(),
      date: z.string(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });
      
      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à réserver un service',
        });
      }
      
      // Vérifier si le service existe
      const service = await ctx.db.service.findUnique({
        where: { id: input.serviceId },
      });
      
      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service non trouvé',
        });
      }
      
      // Vérifier si le prestataire existe
      const provider = await ctx.db.provider.findUnique({
        where: { id: input.providerId },
      });
      
      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prestataire non trouvé',
        });
      }
      
      // Créer le rendez-vous
      const appointment = await ctx.db.appointment.create({
        data: {
          clientId: user.client.id,
          serviceId: input.serviceId,
          providerId: input.providerId,
          date: new Date(input.date),
          notes: input.notes,
          status: 'PENDING',
        },
      });
      
      return {
        id: appointment.id,
        clientId: appointment.clientId,
        serviceId: appointment.serviceId,
        providerId: appointment.providerId,
        status: appointment.status,
        date: appointment.date.toISOString(),
        notes: appointment.notes,
        createdAt: appointment.createdAt.toISOString(),
      };
    })
}); 