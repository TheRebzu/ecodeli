import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// Définir l'interface pour les données de livraison
interface DeliveryWithClient {
  id: string;
  merchantId: string;
  status: string;
  destinationAddress: string;
  createdAt: Date;
  estimatedDelivery: Date | null;
  client?: {
    user?: {
      name?: string | null;
    } | null;
  } | null;
}

export const merchantRouter = router({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: {
          merchant: true,
        },
      });
      
      if (!user || !user.merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profil commerçant non trouvé',
        });
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        businessName: user.merchant.businessName,
        businessAddress: user.merchant.businessAddress,
        businessCity: user.merchant.businessCity,
        businessState: user.merchant.businessState,
        businessPostal: user.merchant.businessPostal,
        businessCountry: user.merchant.businessCountry,
        taxId: user.merchant.taxId,
        websiteUrl: user.merchant.websiteUrl,
        isVerified: user.merchant.isVerified,
        createdAt: user.createdAt
      };
    }),
  
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phoneNumber: z.string().optional(),
      businessName: z.string().optional(),
      businessAddress: z.string().optional(),
      businessCity: z.string().optional(),
      businessState: z.string().optional(),
      businessPostal: z.string().optional(),
      businessCountry: z.string().optional(),
      taxId: z.string().optional(),
      websiteUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un commerçant
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true },
      });
      
      if (!user || !user.merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à mettre à jour ce profil',
        });
      }
      
      // Extraire les données à mettre à jour
      const { name, phoneNumber, ...merchantData } = input;
      
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
      
      // Mise à jour des données commerçant
      if (Object.keys(merchantData).length > 0) {
        await ctx.db.merchant.update({
          where: { userId },
          data: merchantData,
        });
      }
      
      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true },
      });
      
      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        phoneNumber: updatedUser?.phoneNumber,
        businessName: updatedUser?.merchant?.businessName,
        businessAddress: updatedUser?.merchant?.businessAddress,
        updated: true
      };
    }),
  
  getContract: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un commerçant
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true },
      });
      
      if (!user || !user.merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à accéder à ces données',
        });
      }
      
      // Récupérer le contrat
      const contract = await ctx.db.contract.findFirst({
        where: {
          merchantId: user.merchant.id,
          isActive: true
        },
        orderBy: {
          startDate: 'desc'
        }
      });
      
      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Aucun contrat actif trouvé',
        });
      }
      
      return {
        id: contract.id,
        merchantId: contract.merchantId,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate.toISOString(),
        terms: contract.terms,
        status: contract.status
      };
    }),
  
  getDeliveries: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier si l'utilisateur est un commerçant
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true },
      });
      
      if (!user || !user.merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous n\'êtes pas autorisé à accéder à ces données',
        });
      }
      
      // Récupérer les livraisons
      const deliveries = await ctx.db.delivery.findMany({
        where: {
          merchantId: user.merchant.id,
        },
        include: {
          client: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return deliveries.map((delivery: DeliveryWithClient) => ({
        id: delivery.id,
        merchantId: delivery.merchantId,
        status: delivery.status,
        clientName: delivery.client?.user?.name || 'Client inconnu',
        address: delivery.destinationAddress,
        createdAt: delivery.createdAt.toISOString(),
        estimatedDelivery: delivery.estimatedDelivery?.toISOString()
      }));
    })
}); 