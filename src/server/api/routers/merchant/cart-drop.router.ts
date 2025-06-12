import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { CartDropType, CartDropStatus } from '@prisma/client';

/**
 * Router pour la gestion du lâcher de chariot des commerçants
 * Intégration avec les caisses enregistreuses selon le cahier des charges
 */

// Schémas de validation
const createCashRegisterSchema = z.object({
  name: z.string().min(3).max(50),
  location: z.string().min(5).max(100),
  terminalId: z.string().min(3).max(20),
  isActive: z.boolean().default(true),
  maxOrdersPerHour: z.number().min(1).max(100).default(10),
  deliveryZones: z.array(
    z.object({
      name: z.string(),
      postalCodes: z.array(z.string()),
      maxDistance: z.number().min(1).max(50),
    })
  ),
  operatingHours: z.object({
    monday: z.object({ start: z.string(), end: z.string() }).optional(),
    tuesday: z.object({ start: z.string(), end: z.string() }).optional(),
    wednesday: z.object({ start: z.string(), end: z.string() }).optional(),
    thursday: z.object({ start: z.string(), end: z.string() }).optional(),
    friday: z.object({ start: z.string(), end: z.string() }).optional(),
    saturday: z.object({ start: z.string(), end: z.string() }).optional(),
    sunday: z.object({ start: z.string(), end: z.string() }).optional(),
  }),
});

const createCartDropSchema = z.object({
  cashRegisterId: z.string().cuid(),
  type: z.nativeEnum(CartDropType),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(10).max(15),
  customerEmail: z.string().email().optional(),
  deliveryAddress: z.string().min(10).max(200),
  deliveryCity: z.string().min(2).max(50),
  deliveryPostalCode: z.string().min(5).max(10),
  requestedTime: z.date(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().min(1),
        price: z.number().min(0),
        category: z.string().optional(),
      })
    )
    .min(1),
  totalAmount: z.number().min(0),
  specialInstructions: z.string().max(500).optional(),
  isUrgent: z.boolean().default(false),
});

const cartDropFiltersSchema = z.object({
  cashRegisterId: z.string().optional(),
  status: z.nativeEnum(CartDropStatus).optional(),
  type: z.nativeEnum(CartDropType).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  customerName: z.string().optional(),
  deliveryCity: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const updateCartDropStatusSchema = z.object({
  cartDropId: z.string().cuid(),
  status: z.nativeEnum(CartDropStatus),
  notes: z.string().max(500).optional(),
  delivererId: z.string().cuid().optional(), // Pour assignation
});

export const cartDropRouter = router({
  /**
   * Créer une nouvelle caisse enregistreuse (Commerçant)
   */
  createCashRegister: protectedProcedure
    .input(createCashRegisterSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les commerçants peuvent créer des caisses enregistreuses',
        });
      }

      try {
        // Vérifier que le terminalId n'existe pas déjà pour ce commerçant
        const existingTerminal = await ctx.db.merchantCashRegister.findFirst({
          where: {
            merchantId: user.id,
            terminalId: input.terminalId,
          },
        });

        if (existingTerminal) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Ce numéro de terminal existe déjà',
          });
        }

        const { deliveryZones, operatingHours, ...registerData } = input;

        const cashRegister = await ctx.db.merchantCashRegister.create({
          data: {
            ...registerData,
            merchantId: user.id,
            operatingHours,
            isVerified: false, // Nécessite vérification admin
          },
        });

        // Créer les zones de livraison
        if (deliveryZones.length > 0) {
          await ctx.db.merchantDeliveryZone.createMany({
            data: deliveryZones.map(zone => ({
              cashRegisterId: cashRegister.id,
              name: zone.name,
              postalCodes: zone.postalCodes,
              maxDistanceKm: zone.maxDistance,
              isActive: true,
            })),
          });
        }

        return {
          success: true,
          cashRegister,
          message: 'Caisse enregistreuse créée avec succès. Vérification en cours par nos équipes.',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la création de la caisse',
        });
      }
    }),

  /**
   * Obtenir les caisses du commerçant
   */
  getMyCashRegisters: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== 'MERCHANT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les commerçants peuvent consulter leurs caisses',
      });
    }

    try {
      const cashRegisters = await ctx.db.merchantCashRegister.findMany({
        where: { merchantId: user.id },
        include: {
          deliveryZones: {
            where: { isActive: true },
          },
          cartDrops: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              requestedTime: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          terminal: true,
          _count: {
            select: {
              cartDrops: {
                where: {
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { cashRegisters };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des caisses',
      });
    }
  }),

  /**
   * Créer un nouveau lâcher de chariot
   */
  createCartDrop: protectedProcedure
    .input(createCartDropSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les commerçants peuvent créer des lâchers de chariot',
        });
      }

      try {
        // Vérifier que la caisse appartient au commerçant
        const cashRegister = await ctx.db.merchantCashRegister.findFirst({
          where: {
            id: input.cashRegisterId,
            merchantId: user.id,
            isActive: true,
            isVerified: true,
          },
          include: {
            deliveryZones: {
              where: { isActive: true },
            },
          },
        });

        if (!cashRegister) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Caisse enregistreuse non trouvée ou non vérifiée',
          });
        }

        // Vérifier que l'adresse de livraison est dans une zone couverte
        const isInZone = cashRegister.deliveryZones.some(zone =>
          zone.postalCodes.includes(input.deliveryPostalCode)
        );

        if (!isInZone) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Adresse de livraison en dehors des zones couvertes',
          });
        }

        // Vérifier les limites de commandes par heure
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentOrders = await ctx.db.cartDrop.count({
          where: {
            cashRegisterId: input.cashRegisterId,
            createdAt: { gte: oneHourAgo },
            status: { notIn: ['CANCELLED', 'REJECTED'] },
          },
        });

        if (recentOrders >= cashRegister.maxOrdersPerHour) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Limite d'ordres par heure atteinte. Veuillez réessayer plus tard.",
          });
        }

        // Générer un numéro de commande unique
        const orderNumber = `CD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const { items, ...cartDropData } = input;

        const cartDrop = await ctx.db.cartDrop.create({
          data: {
            ...cartDropData,
            orderNumber,
            merchantId: user.id,
            status: 'PENDING',
            items,
            estimatedDeliveryTime: calculateEstimatedDeliveryTime(
              input.requestedTime,
              input.isUrgent
            ),
          },
          include: {
            cashRegister: {
              select: {
                name: true,
                location: true,
              },
            },
          },
        });

        // TODO: Déclencher le système de matching pour trouver un livreur

        return {
          success: true,
          cartDrop,
          orderNumber,
          message: "Lâcher de chariot créé avec succès. Recherche d'un livreur en cours...",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la création du lâcher de chariot',
        });
      }
    }),

  /**
   * Obtenir les lâchers de chariot
   */
  getCartDrops: protectedProcedure.input(cartDropFiltersSchema).query(async ({ ctx, input }) => {
    const { user } = ctx.session;

    try {
      const where: any = {};

      // Filtrage par rôle
      if (user.role === 'MERCHANT') {
        where.merchantId = user.id;
      } else if (user.role === 'DELIVERER') {
        where.OR = [
          { delivererId: user.id },
          { status: 'PENDING', delivererId: null }, // Ordres disponibles
        ];
      } else if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      // Autres filtres
      if (input.cashRegisterId) where.cashRegisterId = input.cashRegisterId;
      if (input.status) where.status = input.status;
      if (input.type) where.type = input.type;
      if (input.customerName) {
        where.customerName = { contains: input.customerName, mode: 'insensitive' };
      }
      if (input.deliveryCity) {
        where.deliveryCity = { contains: input.deliveryCity, mode: 'insensitive' };
      }

      if (input.dateFrom || input.dateTo) {
        where.requestedTime = {};
        if (input.dateFrom) where.requestedTime.gte = input.dateFrom;
        if (input.dateTo) where.requestedTime.lte = input.dateTo;
      }

      const cartDrops = await ctx.db.cartDrop.findMany({
        where,
        include: {
          cashRegister: {
            select: {
              name: true,
              location: true,
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              delivererId: true,
            },
          },
        },
        orderBy: { requestedTime: 'desc' },
        skip: input.offset,
        take: input.limit,
      });

      const totalCount = await ctx.db.cartDrop.count({ where });

      return {
        cartDrops,
        pagination: {
          total: totalCount,
          offset: input.offset,
          limit: input.limit,
          hasMore: input.offset + input.limit < totalCount,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des lâchers de chariot',
      });
    }
  }),

  /**
   * Accepter un lâcher de chariot (Livreur)
   */
  acceptCartDrop: protectedProcedure
    .input(
      z.object({
        cartDropId: z.string().cuid(),
        estimatedPickupTime: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les livreurs peuvent accepter des lâchers de chariot',
        });
      }

      try {
        // Vérifier que le lâcher existe et est disponible
        const cartDrop = await ctx.db.cartDrop.findFirst({
          where: {
            id: input.cartDropId,
            status: 'PENDING',
            delivererId: null,
          },
          include: {
            cashRegister: true,
            merchant: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        if (!cartDrop) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lâcher de chariot non trouvé ou déjà assigné',
          });
        }

        // Vérifier la disponibilité du livreur
        const hasConflictingDelivery = await ctx.db.cartDrop.findFirst({
          where: {
            delivererId: user.id,
            status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
            requestedTime: {
              gte: new Date(cartDrop.requestedTime.getTime() - 2 * 60 * 60 * 1000), // -2h
              lte: new Date(cartDrop.requestedTime.getTime() + 2 * 60 * 60 * 1000), // +2h
            },
          },
        });

        if (hasConflictingDelivery) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Vous avez déjà une livraison en cours à cette heure',
          });
        }

        // Accepter le lâcher
        const updatedCartDrop = await ctx.db.cartDrop.update({
          where: { id: input.cartDropId },
          data: {
            delivererId: user.id,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            estimatedPickupTime: input.estimatedPickupTime || new Date(Date.now() + 30 * 60 * 1000), // +30min
          },
        });

        // TODO: Envoyer notifications au commerçant et au client

        return {
          success: true,
          cartDrop: updatedCartDrop,
          message: 'Lâcher de chariot accepté avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de l'acceptation",
        });
      }
    }),

  /**
   * Mettre à jour le statut d'un lâcher de chariot
   */
  updateStatus: protectedProcedure
    .input(updateCartDropStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      try {
        // Vérifier les permissions
        const cartDrop = await ctx.db.cartDrop.findUnique({
          where: { id: input.cartDropId },
          include: {
            merchant: { select: { id: true } },
            deliverer: { select: { id: true } },
          },
        });

        if (!cartDrop) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lâcher de chariot non trouvé',
          });
        }

        // Vérifier les permissions selon le rôle
        const hasPermission =
          (user.role === 'MERCHANT' && cartDrop.merchant?.id === user.id) ||
          (user.role === 'DELIVERER' && cartDrop.deliverer?.id === user.id) ||
          user.role === 'ADMIN';

        if (!hasPermission) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'avez pas l'autorisation de modifier ce lâcher",
          });
        }

        // Valider les transitions de statut
        const validTransitions = getValidStatusTransitions(cartDrop.status, user.role);
        if (!validTransitions.includes(input.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Transition de statut non autorisée',
          });
        }

        const updateData: any = {
          status: input.status,
          notes: input.notes,
        };

        // Ajouter des timestamps selon le statut
        switch (input.status) {
          case 'IN_PROGRESS':
            updateData.pickedUpAt = new Date();
            break;
          case 'COMPLETED':
            updateData.deliveredAt = new Date();
            break;
          case 'CANCELLED':
            updateData.cancelledAt = new Date();
            break;
        }

        // Assigner un livreur si fourni
        if (input.delivererId) {
          updateData.delivererId = input.delivererId;
          updateData.acceptedAt = new Date();
        }

        const updatedCartDrop = await ctx.db.cartDrop.update({
          where: { id: input.cartDropId },
          data: updateData,
        });

        return {
          success: true,
          cartDrop: updatedCartDrop,
          message: `Statut mis à jour vers ${input.status}`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise à jour du statut',
        });
      }
    }),

  /**
   * Créer un groupement de lâchers (optimisation des livraisons)
   */
  createCartDropGroup: protectedProcedure
    .input(
      z.object({
        cartDropIds: z.array(z.string().cuid()).min(2).max(10),
        name: z.string().min(3).max(50),
        delivererId: z.string().cuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (!['ADMIN', 'MERCHANT'].includes(user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les admins et commerçants peuvent créer des groupements',
        });
      }

      try {
        // Vérifier que tous les lâchers existent et sont disponibles
        const cartDrops = await ctx.db.cartDrop.findMany({
          where: {
            id: { in: input.cartDropIds },
            status: 'PENDING',
            groupId: null,
          },
        });

        if (cartDrops.length !== input.cartDropIds.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Certains lâchers ne sont pas disponibles pour groupement',
          });
        }

        // Vérifier la cohérence géographique (même zone de livraison)
        const deliveryZones = [
          ...new Set(cartDrops.map(cd => cd.deliveryPostalCode.substring(0, 2))),
        ];
        if (deliveryZones.length > 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Les lâchers doivent être dans la même zone géographique',
          });
        }

        const group = await ctx.db.cartDropGroup.create({
          data: {
            name: input.name,
            delivererId: input.delivererId,
            createdById: user.id,
            estimatedDuration: cartDrops.length * 30, // 30min par lâcher
            totalAmount: cartDrops.reduce((sum, cd) => sum + cd.totalAmount, 0),
          },
        });

        // Associer les lâchers au groupe
        await ctx.db.cartDrop.updateMany({
          where: { id: { in: input.cartDropIds } },
          data: {
            groupId: group.id,
            ...(input.delivererId && { delivererId: input.delivererId, status: 'ACCEPTED' }),
          },
        });

        return {
          success: true,
          group,
          message: 'Groupement créé avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la création du groupement',
        });
      }
    }),
});

// Helper functions
function calculateEstimatedDeliveryTime(requestedTime: Date, isUrgent: boolean): Date {
  const baseDelay = isUrgent ? 30 : 60; // minutes
  return new Date(requestedTime.getTime() + baseDelay * 60 * 1000);
}

function getValidStatusTransitions(
  currentStatus: CartDropStatus,
  userRole: string
): CartDropStatus[] {
  const transitions: Record<CartDropStatus, Partial<Record<string, CartDropStatus[]>>> = {
    PENDING: {
      MERCHANT: ['CANCELLED'],
      DELIVERER: ['ACCEPTED'],
      ADMIN: ['ACCEPTED', 'CANCELLED', 'REJECTED'],
    },
    ACCEPTED: {
      MERCHANT: ['CANCELLED'],
      DELIVERER: ['IN_PROGRESS', 'CANCELLED'],
      ADMIN: ['IN_PROGRESS', 'CANCELLED', 'REJECTED'],
    },
    IN_PROGRESS: {
      DELIVERER: ['COMPLETED', 'CANCELLED'],
      ADMIN: ['COMPLETED', 'CANCELLED'],
    },
    COMPLETED: {
      ADMIN: ['CANCELLED'], // Seul admin peut annuler une livraison terminée
    },
    CANCELLED: {},
    REJECTED: {},
  };

  return transitions[currentStatus]?.[userRole] || [];
}
