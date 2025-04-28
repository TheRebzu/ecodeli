import { db } from '@/server/db';
import { UserRole, VerificationStatus } from '@prisma/client';
import {
  DashboardData,
  UserStats,
  DocumentStats,
  TransactionStats,
  WarehouseStats,
  DeliveryStats,
  RecentActivity,
  ActivityChartData,
  ActionItems,
  TimeSeriesData,
} from '@/types/admin/dashboard';
import { TRPCError } from '@trpc/server';
import { startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';

// Fonction pour vérifier si des tables existent dans la base de données
const checkDbModelExists = async (modelName: string): Promise<boolean> => {
  try {
    // Exécuter une requête de comptage pour vérifier si la table existe
    // Si elle n'existe pas, cela lancera une erreur
    await db.$queryRawUnsafe(`SELECT COUNT(*) FROM "${modelName}"`);
    return true;
  } catch (error) {
    console.warn(`La table "${modelName}" n'existe pas dans la base de données.`);
    return false;
  }
};

export const dashboardService = {
  /**
   * Récupère toutes les données du dashboard administrateur
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [
        userStats,
        documentStats,
        transactionStats,
        warehouseStats,
        deliveryStats,
        recentActivities,
        activityChartData,
        actionItems,
      ] = await Promise.all([
        this.getUserStats(),
        this.getDocumentStats(),
        this.getTransactionStats(),
        this.getWarehouseStats(),
        this.getDeliveryStats(),
        this.getRecentActivities(),
        this.getActivityChartData(),
        this.getActionItems(),
      ]);

      return {
        userStats,
        documentStats,
        transactionStats,
        warehouseStats,
        deliveryStats,
        recentActivities,
        activityChartData,
        actionItems,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données du dashboard:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des données du dashboard',
      });
    }
  },

  /**
   * Récupère les statistiques des utilisateurs
   */
  async getUserStats(): Promise<UserStats> {
    try {
      // Périodes de temps
      const today = startOfDay(new Date());
      const thisWeekStart = startOfWeek(new Date());
      const thisMonthStart = startOfMonth(new Date());

      // Récupérer le nombre total d'utilisateurs
      const totalUsers = await db.user.count();

      // Récupérer la distribution par rôle
      const roleDistribution = await db.user.groupBy({
        by: ['role'],
        _count: {
          id: true,
        },
      });

      // Formater la distribution par rôle
      const formattedRoleDistribution: { [key in UserRole]?: number } = {};
      roleDistribution.forEach(item => {
        formattedRoleDistribution[item.role as UserRole] = item._count.id;
      });

      // Nouveaux utilisateurs
      const newUsersToday = await db.user.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      });

      const newUsersThisWeek = await db.user.count({
        where: {
          createdAt: {
            gte: thisWeekStart,
          },
        },
      });

      const newUsersThisMonth = await db.user.count({
        where: {
          createdAt: {
            gte: thisMonthStart,
          },
        },
      });

      // Utilisateurs actifs (basé sur la dernière connexion)
      const activeUsersToday = await db.user.count({
        where: {
          lastLoginAt: {
            gte: today,
          },
        },
      });

      const activeUsersThisWeek = await db.user.count({
        where: {
          lastLoginAt: {
            gte: thisWeekStart,
          },
        },
      });

      return {
        total: totalUsers,
        roleDistribution: formattedRoleDistribution,
        newUsers: {
          today: newUsersToday,
          thisWeek: newUsersThisWeek,
          thisMonth: newUsersThisMonth,
        },
        activeUsers: {
          today: activeUsersToday,
          thisWeek: activeUsersThisWeek,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques utilisateurs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques utilisateurs',
      });
    }
  },

  /**
   * Récupère les statistiques des documents
   */
  async getDocumentStats(): Promise<DocumentStats> {
    try {
      // Vérifier si la table documents existe
      const documentsExist = await checkDbModelExists('documents');
      if (!documentsExist) {
        return {
          pending: 0,
          approved: 0,
          rejected: 0,
          pendingByRole: {},
          recentlySubmitted: [],
        };
      }

      // Récupérer le nombre de documents par statut
      const pendingDocs = await db.document.count({
        where: {
          verificationStatus: VerificationStatus.PENDING,
        },
      });

      const approvedDocs = await db.document.count({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
        },
      });

      const rejectedDocs = await db.document.count({
        where: {
          verificationStatus: VerificationStatus.REJECTED,
        },
      });

      // Récupérer les documents en attente par rôle d'utilisateur - correction de userId
      const pendingByRole = await db.$queryRaw<Array<{ role: UserRole; count: bigint }>>`
        SELECT u.role, COUNT(d.id) as count
        FROM "documents" d
        JOIN "users" u ON d."userId" = u.id
        WHERE d."verificationStatus" = 'PENDING'
        GROUP BY u.role
      `;

      // Formater les résultats
      const formattedPendingByRole: { [key in UserRole]?: number } = {};
      pendingByRole.forEach(item => {
        formattedPendingByRole[item.role as UserRole] = Number(item.count);
      });

      // Récupérer les documents récemment soumis (mocked)
      const recentlySubmitted = [] as DocumentStats['recentlySubmitted'];

      return {
        pending: pendingDocs,
        approved: approvedDocs,
        rejected: rejectedDocs,
        pendingByRole: formattedPendingByRole,
        recentlySubmitted,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques documents:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques documents',
      });
    }
  },

  /**
   * Récupère les statistiques des transactions
   */
  async getTransactionStats(): Promise<TransactionStats> {
    try {
      // Vérifier si la table transactions existe
      const transactionsExist = await checkDbModelExists('transactions');
      if (!transactionsExist) {
        return {
          total: 0,
          today: 0,
          thisWeek: 0,
          volume: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
          },
          status: {
            completed: 0,
            pending: 0,
            failed: 0,
          },
        };
      }

      // Périodes de temps
      const today = startOfDay(new Date());
      const thisWeekStart = startOfWeek(new Date());
      const thisMonthStart = startOfMonth(new Date());

      // Si le modèle transaction existe mais n'est pas encore disponible dans db, utilisez db.$queryRaw
      const [{ count: totalTransactions }] = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "transactions"
      `;

      const [{ count: transactionsToday }] = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "transactions"
        WHERE "createdAt" >= ${today}
      `;

      const [{ count: transactionsThisWeek }] = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "transactions"
        WHERE "createdAt" >= ${thisWeekStart}
      `;

      // Transactions par statut
      const [{ count: completedTransactions }] = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "transactions"
        WHERE "status" = 'COMPLETED'
      `;

      const [{ count: pendingTransactions }] = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "transactions"
        WHERE "status" = 'PENDING'
      `;

      const [{ count: failedTransactions }] = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "transactions"
        WHERE "status" = 'FAILED'
      `;

      return {
        total: Number(totalTransactions),
        today: Number(transactionsToday),
        thisWeek: Number(transactionsThisWeek),
        volume: {
          today: 0, // Pour simplifier, on retourne 0 ou vous pouvez ajouter une requête SQL
          thisWeek: 0,
          thisMonth: 0,
        },
        status: {
          completed: Number(completedTransactions),
          pending: Number(pendingTransactions),
          failed: Number(failedTransactions),
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques transactions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques transactions',
      });
    }
  },

  /**
   * Calcule le volume de transactions depuis une date donnée
   */
  async calculateTransactionVolume(fromDate: Date): Promise<number> {
    const result = await db.transaction.aggregate({
      where: {
        createdAt: {
          gte: fromDate,
        },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  },

  /**
   * Récupère les statistiques des entrepôts
   */
  async getWarehouseStats(): Promise<WarehouseStats> {
    try {
      // Vérifier si la table warehouses existe
      const warehousesExist = await checkDbModelExists('warehouses');
      if (!warehousesExist) {
        return {
          total: 0,
          totalCapacity: 0,
          occupiedCapacity: 0,
          occupancyRate: 0,
          warehouseOccupancy: [],
        };
      }

      // Utilisez des requêtes SQL brutes pour éviter les erreurs Prisma
      const warehouses = await db.$queryRaw`
        SELECT * FROM "warehouses"
      `;

      return {
        total: warehouses.length || 0,
        totalCapacity: 0,
        occupiedCapacity: 0,
        occupancyRate: 0,
        warehouseOccupancy: [],
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques entrepôts:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques entrepôts',
      });
    }
  },

  /**
   * Récupère les statistiques des livraisons
   */
  async getDeliveryStats(): Promise<DeliveryStats> {
    try {
      // Vérifier si la table deliveries existe
      const deliveriesExist = await checkDbModelExists('deliveries');
      if (!deliveriesExist) {
        return {
          active: 0,
          completed: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
          },
          cancelled: 0,
          avgDeliveryTime: 0,
        };
      }

      // Utilisez des requêtes SQL brutes pour éviter les erreurs Prisma
      const [{ count: activeDeliveries }] = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "deliveries"
        WHERE "status" = 'IN_PROGRESS'
      `;

      return {
        active: Number(activeDeliveries),
        completed: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
        },
        cancelled: 0,
        avgDeliveryTime: 0,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques livraisons:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques livraisons',
      });
    }
  },

  /**
   * Récupère les activités récentes
   */
  async getRecentActivities(limit = 10): Promise<RecentActivity[]> {
    try {
      return []; // Par défaut, renvoie un tableau vide
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des activités récentes',
      });
    }
  },

  /**
   * Récupère les données du graphique d'activité
   */
  async getActivityChartData(): Promise<ActivityChartData> {
    try {
      return {
        deliveries: [],
        transactions: [],
        registrations: [],
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données de graphique:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des données de graphique',
      });
    }
  },

  /**
   * Récupère les éléments d'action
   */
  async getActionItems(): Promise<ActionItems> {
    try {
      return {
        pendingVerifications: 0,
        expiringContracts: 0,
        openReports: 0,
        lowInventoryWarehouses: 0,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des éléments d'action:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la récupération des éléments d'action",
      });
    }
  },
};
