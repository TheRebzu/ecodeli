import { z } from 'zod';
import { router, adminProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { AnnouncementStatus, AnnouncementType } from '@prisma/client';

export const adminAnnouncementsRouter = router({
  // Récupérer toutes les annonces avec filtres avancés
  getAll: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        status: z.nativeEnum(AnnouncementStatus).optional(),
        type: z.nativeEnum(AnnouncementType).optional(),
        searchTerm: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        userId: z.string().optional(),
        sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        page,
        limit,
        status,
        type,
        searchTerm,
        startDate,
        endDate,
        userId,
        sortBy,
        sortOrder,
      } = input;

      const offset = (page - 1) * limit;

      const where: any = {};

      if (status) where.status = status;
      if (type) where.type = type;
      if (userId) where.clientId = userId;
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      if (searchTerm) {
        where.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { pickupAddress: { contains: searchTerm, mode: 'insensitive' } },
          { deliveryAddress: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const [announcements, total] = await Promise.all([
        ctx.db.announcement.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            deliverer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            applications: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            _count: {
              select: {
                applications: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: offset,
          take: limit,
        }),
        ctx.db.announcement.count({ where }),
      ]);

      return {
        announcements,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit,
        },
      };
    }),

  // Statistiques globales
  getStats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        total,
        active,
        pending,
        completed,
        cancelled,
        thisMonth,
        byStatus,
        byType,
        topUsers,
      ] = await Promise.all([
        // Total général
        ctx.db.announcement.count({ where }),
        
        // Actives
        ctx.db.announcement.count({
          where: { ...where, status: { in: ['PUBLISHED', 'ASSIGNED', 'IN_PROGRESS'] } },
        }),
        
        // En attente
        ctx.db.announcement.count({
          where: { ...where, status: 'PUBLISHED' },
        }),
        
        // Terminées
        ctx.db.announcement.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        
        // Annulées
        ctx.db.announcement.count({
          where: { ...where, status: 'CANCELLED' },
        }),
        
        // Ce mois
        ctx.db.announcement.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        
        // Répartition par statut
        ctx.db.announcement.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        
        // Répartition par type
        ctx.db.announcement.groupBy({
          by: ['type'],
          where,
          _count: true,
        }),
        
        // Top utilisateurs
        ctx.db.announcement.groupBy({
          by: ['clientId'],
          where,
          _count: true,
          orderBy: { _count: { _all: 'desc' } },
          take: 10,
        }),
      ]);

      // Récupérer les infos des top utilisateurs
      const userIds = topUsers.map((user: any) => user.clientId);
      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      const topUsersWithDetails = topUsers.map((user: any) => ({
        ...user,
        user: users.find((u: any) => u.id === user.clientId),
      }));

      return {
        total,
        active,
        pending,
        completed,
        cancelled,
        thisMonth,
        byStatus: byStatus.map((item: any) => ({
          status: item.status,
          count: item._count,
        })),
        byType: byType.map((item: any) => ({
          type: item.type,
          count: item._count,
        })),
        topUsers: topUsersWithDetails,
      };
    }),

  // Annonces en attente de modération
  getPendingModeration: adminProcedure
    .query(async ({ ctx }) => {
      const announcements = await ctx.db.announcement.findMany({
        where: {
          OR: [
            { status: 'PUBLISHED', flaggedForModeration: true },
            { status: 'PUBLISHED', isReported: true },
          ],
        },
        include: {
          client: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          reports: {
            include: {
              reporter: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return announcements;
    }),

  // Modérer une annonce
  moderate: adminProcedure
    .input(
      z.object({
        announcementId: z.string(),
        action: z.enum(['approve', 'reject', 'suspend']),
        reason: z.string().optional(),
        moderatorNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { announcementId, action, reason, moderatorNote } = input;

      const announcement = await ctx.db.announcement.findUnique({
        where: { id: announcementId },
        include: { client: true },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Annonce non trouvée',
        });
      }

      let newStatus: AnnouncementStatus;
      switch (action) {
        case 'approve':
          newStatus = 'PUBLISHED';
          break;
        case 'reject':
          newStatus = 'CANCELLED';
          break;
        case 'suspend':
          newStatus = 'CANCELLED'; // Using CANCELLED instead of SUSPENDED
          break;
        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Action de modération invalide',
          });
      }

      // Mettre à jour l'annonce
      const updatedAnnouncement = await ctx.db.announcement.update({
        where: { id: announcementId },
        data: {
          status: newStatus,
          flaggedForModeration: false,
          moderatedAt: new Date(),
          moderatedBy: ctx.session.user.id,
          moderationReason: reason,
          moderationNote: moderatorNote,
        },
      });

      // Créer un log d'audit si la table existe
      try {
        await ctx.db.auditLog.create({
          data: {
            action: `ANNOUNCEMENT_${action.toUpperCase()}`,
            entityType: 'ANNOUNCEMENT',
            entityId: announcementId,
            performedBy: ctx.session.user.id,
            details: {
              reason,
              moderatorNote,
              previousStatus: announcement.status,
              newStatus,
            },
          },
        });
      } catch (error) {
        // Si la table auditLog n'existe pas, continuons sans erreur
        console.warn('AuditLog table might not exist:', error);
      }

      // TODO: Envoyer une notification à l'utilisateur
      
      return updatedAnnouncement;
    }),

  // Statistiques de modération
  getModerationStats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const where: any = {};
      if (startDate || endDate) {
        where.moderatedAt = {};
        if (startDate) where.moderatedAt.gte = startDate;
        if (endDate) where.moderatedAt.lte = endDate;
      }

      const [
        totalModerated,
        approved,
        rejected,
        suspended,
        pending,
        flagged,
        reported,
      ] = await Promise.all([
        ctx.db.announcement.count({
          where: { ...where, moderatedAt: { not: null } },
        }),
        ctx.db.announcement.count({
          where: { ...where, moderatedAt: { not: null }, status: 'PUBLISHED' },
        }),
        ctx.db.announcement.count({
          where: { ...where, moderatedAt: { not: null }, status: 'CANCELLED' },
        }),
        ctx.db.announcement.count({
          where: { ...where, moderatedAt: { not: null }, status: 'CANCELLED' },
        }),
        ctx.db.announcement.count({
          where: { flaggedForModeration: true },
        }),
        ctx.db.announcement.count({
          where: { flaggedForModeration: true },
        }),
        ctx.db.announcement.count({
          where: { isReported: true },
        }),
      ]);

      return {
        totalModerated,
        approved,
        rejected,
        suspended,
        pending,
        flagged,
        reported,
        approvalRate: totalModerated > 0 ? (approved / totalModerated) * 100 : 0,
      };
    }),

  // Recherche avancée
  search: adminProcedure
    .input(
      z.object({
        query: z.string().min(1),
        filters: z.object({
          status: z.array(z.nativeEnum(AnnouncementStatus)).optional(),
          type: z.array(z.nativeEnum(AnnouncementType)).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          minAmount: z.number().optional(),
          maxAmount: z.number().optional(),
        }).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, filters, page, limit } = input;
      const offset = (page - 1) * limit;

      const where: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { pickupAddress: { contains: query, mode: 'insensitive' } },
          { deliveryAddress: { contains: query, mode: 'insensitive' } },
          {
            client: {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
        ],
      };

      if (filters?.status) where.status = { in: filters.status };
      if (filters?.type) where.type = { in: filters.type };
      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }
      if (filters?.minAmount || filters?.maxAmount) {
        where.totalPrice = {};
        if (filters.minAmount) where.totalPrice.gte = filters.minAmount;
        if (filters.maxAmount) where.totalPrice.lte = filters.maxAmount;
      }

      const [announcements, total] = await Promise.all([
        ctx.db.announcement.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            deliverer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                applications: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        ctx.db.announcement.count({ where }),
      ]);

      return {
        announcements,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit,
        },
      };
    }),
});