import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const dashboardRouter = createTRPCRouter({
  // Procédure pour récupérer les données du tableau de bord du client
  getClientDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      
      // Vérifier que l'utilisateur est bien un client
      if (userRole !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette ressource",
        });
      }
      
      // Récupérer le profil du client
      const clientProfile = await ctx.prisma.clientProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
      
      if (!clientProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil client non trouvé",
        });
      }
      
      // Récupérer les commandes récentes du client
      const recentOrders = await ctx.prisma.order.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // Récupérer les adresses de livraison du client
      const deliveryAddresses = await ctx.prisma.deliveryAddress.findMany({
        where: { userId },
        orderBy: { isDefault: "desc" },
      });
      
      // Récupérer les méthodes de paiement du client
      const paymentMethods = await ctx.prisma.paymentMethod.findMany({
        where: { userId },
        orderBy: { isDefault: "desc" },
      });
      
      return {
        profile: clientProfile,
        recentOrders,
        deliveryAddresses,
        paymentMethods,
        stats: {
          totalOrders: await ctx.prisma.order.count({ where: { clientId: userId } }),
          pendingOrders: await ctx.prisma.order.count({ 
            where: { 
              clientId: userId,
              status: { in: ["PENDING", "PROCESSING", "READY_FOR_PICKUP"] }
            } 
          }),
          completedOrders: await ctx.prisma.order.count({ 
            where: { 
              clientId: userId,
              status: "DELIVERED"
            } 
          }),
        }
      };
    }),
  
  // Procédure pour récupérer les données du tableau de bord du livreur
  getDelivererDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      
      // Vérifier que l'utilisateur est bien un livreur
      if (userRole !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette ressource",
        });
      }
      
      // Récupérer le profil du livreur
      const delivererProfile = await ctx.prisma.delivererProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
      
      if (!delivererProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil livreur non trouvé",
        });
      }
      
      // Récupérer les livraisons en cours
      const currentDeliveries = await ctx.prisma.delivery.findMany({
        where: { 
          delivererId: userId,
          status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] }
        },
        orderBy: { updatedAt: "desc" },
        include: {
          order: {
            include: {
              store: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      
      // Récupérer l'historique des livraisons
      const deliveryHistory = await ctx.prisma.delivery.findMany({
        where: { 
          delivererId: userId,
          status: { in: ["DELIVERED", "FAILED"] }
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          order: {
            include: {
              store: true,
            },
          },
        },
      });
      
      // Récupérer les documents du livreur
      const documents = await ctx.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      
      return {
        profile: delivererProfile,
        currentDeliveries,
        deliveryHistory,
        documents,
        stats: {
          totalDeliveries: await ctx.prisma.delivery.count({ where: { delivererId: userId } }),
          completedDeliveries: await ctx.prisma.delivery.count({ 
            where: { 
              delivererId: userId,
              status: "DELIVERED"
            } 
          }),
          failedDeliveries: await ctx.prisma.delivery.count({ 
            where: { 
              delivererId: userId,
              status: "FAILED"
            } 
          }),
          averageRating: await ctx.prisma.deliveryRating.aggregate({
            where: { delivery: { delivererId: userId } },
            _avg: { rating: true },
          }).then(result => result._avg.rating || 0),
        },
        isVerified: delivererProfile.isVerified,
      };
    }),
  
  // Procédure pour récupérer les données du tableau de bord du commerçant
  getMerchantDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      
      // Vérifier que l'utilisateur est bien un commerçant
      if (userRole !== "MERCHANT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette ressource",
        });
      }
      
      // Récupérer les commerces du commerçant
      const stores = await ctx.prisma.store.findMany({
        where: { merchantId: userId },
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
      });
      
      if (stores.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Aucun commerce trouvé",
        });
      }
      
      // Récupérer les commandes récentes pour tous les commerces
      const storeIds = stores.map(store => store.id);
      const recentOrders = await ctx.prisma.order.findMany({
        where: { storeId: { in: storeIds } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });
      
      // Récupérer les produits les plus vendus
      const topProducts = await ctx.prisma.product.findMany({
        where: { storeId: { in: storeIds } },
        orderBy: {
          orderItems: {
            _count: "desc",
          },
        },
        take: 5,
        include: {
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
      });
      
      // Récupérer les documents du commerçant
      const documents = await ctx.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      
      return {
        stores,
        recentOrders,
        topProducts,
        documents,
        stats: {
          totalStores: stores.length,
          totalProducts: stores.reduce((acc, store) => acc + store._count.products, 0),
          totalOrders: stores.reduce((acc, store) => acc + store._count.orders, 0),
          pendingOrders: await ctx.prisma.order.count({ 
            where: { 
              storeId: { in: storeIds },
              status: { in: ["PENDING", "PROCESSING", "READY_FOR_PICKUP"] }
            } 
          }),
          revenue: await ctx.prisma.order.aggregate({
            where: { 
              storeId: { in: storeIds },
              status: "DELIVERED"
            },
            _sum: { totalAmount: true },
          }).then(result => result._sum.totalAmount || 0),
        },
        isVerified: stores.some(store => store.isVerified),
      };
    }),
  
  // Procédure pour récupérer les données du tableau de bord du prestataire
  getProviderDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      
      // Vérifier que l'utilisateur est bien un prestataire
      if (userRole !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette ressource",
        });
      }
      
      // Récupérer le profil du prestataire
      const providerProfile = await ctx.prisma.serviceProvider.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });
      
      if (!providerProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil prestataire non trouvé",
        });
      }
      
      // Récupérer les services du prestataire
      const services = await ctx.prisma.service.findMany({
        where: { providerId: userId },
        include: {
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      });
      
      // Récupérer les réservations en cours
      const currentBookings = await ctx.prisma.serviceBooking.findMany({
        where: { 
          service: { providerId: userId },
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] }
        },
        orderBy: { scheduledAt: "asc" },
        include: {
          service: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // Récupérer l'historique des réservations
      const bookingHistory = await ctx.prisma.serviceBooking.findMany({
        where: { 
          service: { providerId: userId },
          status: { in: ["COMPLETED", "CANCELLED"] }
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          service: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // Récupérer les documents du prestataire
      const documents = await ctx.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      
      return {
        profile: providerProfile,
        services,
        currentBookings,
        bookingHistory,
        documents,
        stats: {
          totalServices: services.length,
          totalBookings: services.reduce((acc, service) => acc + service._count.bookings, 0),
          pendingBookings: await ctx.prisma.serviceBooking.count({ 
            where: { 
              service: { providerId: userId },
              status: { in: ["PENDING", "CONFIRMED"] }
            } 
          }),
          completedBookings: await ctx.prisma.serviceBooking.count({ 
            where: { 
              service: { providerId: userId },
              status: "COMPLETED"
            } 
          }),
          averageRating: await ctx.prisma.serviceRating.aggregate({
            where: { booking: { service: { providerId: userId } } },
            _avg: { rating: true },
          }).then(result => result._avg.rating || 0),
          revenue: await ctx.prisma.serviceBooking.aggregate({
            where: { 
              service: { providerId: userId },
              status: "COMPLETED"
            },
            _sum: { totalAmount: true },
          }).then(result => result._sum.totalAmount || 0),
        },
        isVerified: providerProfile.isVerified,
      };
    }),
  
  // Procédure pour récupérer les données du tableau de bord de l'administrateur
  getAdminDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const userRole = ctx.session.user.role;
      
      // Vérifier que l'utilisateur est bien un administrateur
      if (userRole !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette ressource",
        });
      }
      
      // Récupérer les statistiques générales
      const userStats = {
        totalUsers: await ctx.prisma.user.count(),
        clients: await ctx.prisma.user.count({ where: { role: "CLIENT" } }),
        deliverers: await ctx.prisma.user.count({ where: { role: "DELIVERER" } }),
        merchants: await ctx.prisma.user.count({ where: { role: "MERCHANT" } }),
        providers: await ctx.prisma.user.count({ where: { role: "PROVIDER" } }),
        admins: await ctx.prisma.user.count({ where: { role: "ADMIN" } }),
      };
      
      // Récupérer les statistiques des commandes
      const orderStats = {
        totalOrders: await ctx.prisma.order.count(),
        pendingOrders: await ctx.prisma.order.count({ where: { status: "PENDING" } }),
        processingOrders: await ctx.prisma.order.count({ where: { status: "PROCESSING" } }),
        readyOrders: await ctx.prisma.order.count({ where: { status: "READY_FOR_PICKUP" } }),
        inTransitOrders: await ctx.prisma.order.count({ where: { status: "IN_TRANSIT" } }),
        deliveredOrders: await ctx.prisma.order.count({ where: { status: "DELIVERED" } }),
        cancelledOrders: await ctx.prisma.order.count({ where: { status: "CANCELLED" } }),
      };
      
      // Récupérer les statistiques des commerces
      const storeStats = {
        totalStores: await ctx.prisma.store.count(),
        verifiedStores: await ctx.prisma.store.count({ where: { isVerified: true } }),
        unverifiedStores: await ctx.prisma.store.count({ where: { isVerified: false } }),
      };
      
      // Récupérer les statistiques des services
      const serviceStats = {
        totalServices: await ctx.prisma.service.count(),
        totalBookings: await ctx.prisma.serviceBooking.count(),
        pendingBookings: await ctx.prisma.serviceBooking.count({ where: { status: "PENDING" } }),
        confirmedBookings: await ctx.prisma.serviceBooking.count({ where: { status: "CONFIRMED" } }),
        completedBookings: await ctx.prisma.serviceBooking.count({ where: { status: "COMPLETED" } }),
        cancelledBookings: await ctx.prisma.serviceBooking.count({ where: { status: "CANCELLED" } }),
      };
      
      // Récupérer les documents en attente de vérification
      const pendingDocuments = await ctx.prisma.document.count({ where: { status: "PENDING" } });
      
      // Récupérer les utilisateurs récemment inscrits
      const recentUsers = await ctx.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
      
      // Récupérer les commandes récentes
      const recentOrders = await ctx.prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return {
        userStats,
        orderStats,
        storeStats,
        serviceStats,
        pendingDocuments,
        recentUsers,
        recentOrders,
        revenue: await ctx.prisma.order.aggregate({
          where: { status: "DELIVERED" },
          _sum: { totalAmount: true },
        }).then(result => result._sum.totalAmount || 0),
      };
    }),
});
