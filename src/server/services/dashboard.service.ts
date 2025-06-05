import { db } from '../db';
import { UserRole, DeliveryStatus, DocumentStatus, VerificationStatus } from '@prisma/client';

/**
 * Service pour la gestion du tableau de bord administrateur
 */
export const dashboardService = {
  /**
   * Récupère toutes les données du tableau de bord administrateur
   */
  async getDashboardData() {
    try {
      // Récupération des données avec gestion des erreurs
      let userStats,
        documentStats,
        transactionStats,
        warehouseStats,
        deliveryStats,
        recentActivities,
        activityChartData,
        actionItems;

      try {
        userStats = await this.getUserStats();
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques utilisateurs:', error);
        // Fournir une structure par défaut compatible
        userStats = {
          total: 0,
          roleDistribution: {},
          newUsers: { today: 0, thisWeek: 0, thisMonth: 0 },
          activeUsers: { today: 0, thisWeek: 0 },
          totalUsers: 0,
          activeUsers: 0,
          pendingVerifications: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
          usersByRole: {},
        };
      }

      try {
        documentStats = await this.getDocumentStats();
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques documents:', error);
        documentStats = {
          pending: 0,
          approved: 0,
          rejected: 0,
          pendingByRole: {},
          recentlySubmitted: [],
          totalDocuments: 0,
          pendingReview: 0,
          submittedToday: 0,
          documentsByType: {},
        };
      }

      try {
        transactionStats = await this.getTransactionStats();
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques transactions:', error);
        transactionStats = {
          total: 0,
          today: 0,
          thisWeek: 0,
          volume: { today: 0, thisWeek: 0, thisMonth: 0 },
          status: { completed: 0, pending: 0, failed: 0 },
          totalPayments: 0,
          totalAmount: 0,
          last30DaysPayments: 0,
          last30DaysAmount: 0,
          paymentsByStatus: {},
        };
      }

      try {
        warehouseStats = await this.getWarehouseStats();
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques entrepôts:', error);
        warehouseStats = {
          total: 0,
          totalCapacity: 0,
          occupiedCapacity: 0,
          occupancyRate: 0,
          warehouseOccupancy: [],
          totalWarehouses: 0,
          totalBoxes: 0,
          availableBoxes: 0,
          occupiedBoxes: 0,
          maintenanceBoxes: 0,
        };
      }

      try {
        deliveryStats = await this.getDeliveryStats();
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques livraisons:', error);
        deliveryStats = {
          active: 0,
          completed: { today: 0, thisWeek: 0, thisMonth: 0 },
          cancelled: 0,
          avgDeliveryTime: 0,
          totalDeliveries: 0,
          pendingDeliveries: 0,
          inProgressDeliveries: 0,
        };
      }

      try {
        recentActivities = await this.getRecentActivities(10);
      } catch (error) {
        console.error('Erreur lors de la récupération des activités récentes:', error);
        recentActivities = [];
      }

      try {
        activityChartData = await this.getActivityChartData();
      } catch (error) {
        console.error('Erreur lors de la récupération des données graphiques:', error);
        activityChartData = {
          deliveries: [],
          transactions: [],
          registrations: [],
        };
      }

      try {
        actionItems = await this.getActionItems();
      } catch (error) {
        console.error('Erreur lors de la récupération des actions requises:', error);
        actionItems = {
          pendingVerifications: 0,
          expiringContracts: 0,
          openReports: 0,
          lowInventoryWarehouses: 0,
        };
      }

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
      console.error('Erreur lors de la récupération des données du tableau de bord:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques utilisateurs
   */
  async getUserStats() {
    try {
      const totalUsers = await db.user.count();
      const activeUsers = await db.user.count({ where: { status: 'ACTIVE' } });
      const pendingVerifications = await db.user.count({
        where: { status: 'PENDING_VERIFICATION' },
      });

      // Statistiques par rôle
      const clientCount = await db.user.count({ where: { role: 'CLIENT' } });
      const delivererCount = await db.user.count({ where: { role: 'DELIVERER' } });
      const merchantCount = await db.user.count({ where: { role: 'MERCHANT' } });
      const providerCount = await db.user.count({ where: { role: 'PROVIDER' } });
      const adminCount = await db.user.count({ where: { role: 'ADMIN' } });

      // Nouveaux utilisateurs (aujourd'hui)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newUsersToday = await db.user.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      });

      // Nouveaux utilisateurs (cette semaine)
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const newUsersThisWeek = await db.user.count({
        where: {
          createdAt: {
            gte: startOfWeek,
          },
        },
      });

      // Nouveaux utilisateurs (ce mois)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const newUsersThisMonth = await db.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      });

      // Utilisateurs actifs aujourd'hui (simulé pour l'exemple)
      const activeUsersToday = Math.round(activeUsers * 0.3); // 30% des utilisateurs actifs
      const activeUsersThisWeek = Math.round(activeUsers * 0.7); // 70% des utilisateurs actifs

      return {
        total: totalUsers,
        roleDistribution: {
          CLIENT: clientCount,
          DELIVERER: delivererCount,
          MERCHANT: merchantCount,
          PROVIDER: providerCount,
          ADMIN: adminCount,
        },
        newUsers: {
          today: newUsersToday,
          thisWeek: newUsersThisWeek,
          thisMonth: newUsersThisMonth,
        },
        activeUsers: {
          today: activeUsersToday,
          thisWeek: activeUsersThisWeek,
        },
        // Ajouter ces propriétés pour la compatibilité avec le code existant
        totalUsers,
        activeUsers,
        pendingVerifications,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersByRole: {
          CLIENT: clientCount,
          DELIVERER: delivererCount,
          MERCHANT: merchantCount,
          PROVIDER: providerCount,
          ADMIN: adminCount,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques utilisateurs:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques de documents
   */
  async getDocumentStats() {
    try {
      const totalDocuments = await db.document.count();
      const pendingReview = await db.document.count({
        where: { verificationStatus: 'PENDING' },
      });
      const approved = await db.document.count({
        where: { verificationStatus: 'APPROVED' },
      });
      const rejected = await db.document.count({
        where: { verificationStatus: 'REJECTED' },
      });

      // Documents par type
      const idCards = await db.document.count({
        where: { type: 'ID_CARD' },
      });
      const drivingLicenses = await db.document.count({
        where: { type: 'DRIVING_LICENSE' },
      });
      const vehicleRegistrations = await db.document.count({
        where: { type: 'VEHICLE_REGISTRATION' },
      });
      const insurances = await db.document.count({
        where: { type: 'INSURANCE' },
      });
      const proofOfAddress = await db.document.count({
        where: { type: 'PROOF_OF_ADDRESS' },
      });
      const others = await db.document.count({
        where: { type: 'OTHER' },
      });

      // Documents soumis aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const submittedToday = await db.document.count({
        where: {
          uploadedAt: {
            gte: today,
          },
        },
      });

      // Structure pour la compatibilité avec DocumentStats
      const mockRecentlySubmitted = [
        {
          id: 'mock-1',
          type: 'ID_CARD',
          submittedAt: new Date(),
          user: {
            id: 'mock-user-1',
            name: 'Utilisateur Test',
            email: 'test@example.com',
            role: 'CLIENT' as UserRole,
          },
        },
      ];

      return {
        // Propriétés pour l'interface DocumentStats
        pending: pendingReview,
        approved,
        rejected,
        pendingByRole: {
          CLIENT: Math.round(pendingReview * 0.5),
          DELIVERER: Math.round(pendingReview * 0.3),
          MERCHANT: Math.round(pendingReview * 0.15),
          PROVIDER: Math.round(pendingReview * 0.05),
        },
        recentlySubmitted: mockRecentlySubmitted,

        // Garder les propriétés originales pour la compatibilité
        totalDocuments,
        pendingReview,
        submittedToday,
        documentsByType: {
          ID_CARD: idCards,
          DRIVING_LICENSE: drivingLicenses,
          VEHICLE_REGISTRATION: vehicleRegistrations,
          INSURANCE: insurances,
          PROOF_OF_ADDRESS: proofOfAddress,
          OTHER: others,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de documents:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques de transactions
   */
  async getTransactionStats() {
    try {
      const totalPayments = await db.payment.count();
      const totalAmount = await db.payment.aggregate({
        _sum: {
          amount: true,
        },
      });

      // Transactions par statut
      const successful = await db.payment.count({ where: { status: 'COMPLETED' } });
      const pending = await db.payment.count({ where: { status: 'PENDING' } });
      const failed = await db.payment.count({ where: { status: 'FAILED' } });

      // Statistiques des 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const last30DaysPayments = await db.payment.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      const last30DaysAmount = await db.payment.aggregate({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        _sum: {
          amount: true,
        },
      });

      return {
        totalPayments,
        totalAmount: totalAmount._sum.amount?.toNumber() || 0,
        last30DaysPayments,
        last30DaysAmount: last30DaysAmount._sum.amount?.toNumber() || 0,
        paymentsByStatus: {
          COMPLETED: successful,
          PENDING: pending,
          FAILED: failed,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de transactions:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques d'entrepôts
   */
  async getWarehouseStats() {
    try {
      const totalWarehouses = await db.warehouse.count();
      const totalBoxes = await db.box.count();
      const availableBoxes = await db.box.count({ where: { status: 'AVAILABLE' } });
      const occupiedBoxes = await db.box.count({ where: { status: 'OCCUPIED' } });
      const maintenanceBoxes = await db.box.count({ where: { status: 'MAINTENANCE' } });

      // Calcul du taux d'occupation
      const occupancyRate = totalBoxes > 0 ? (occupiedBoxes / totalBoxes) * 100 : 0;

      // Réservations actives
      const activeReservations = await db.reservation.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: new Date(),
          },
        },
      });

      // Récupérer les entrepôts avec leur taux d'occupation
      const warehouses = await db.warehouse.findMany({
        include: {
          boxes: true,
        },
      });

      // Calculer le taux d'occupation pour chaque entrepôt
      const warehouseOccupancy = warehouses.map(warehouse => {
        const total = warehouse.boxes.length;
        const occupied = warehouse.boxes.filter(box => box.status === 'OCCUPIED').length;
        const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

        return {
          id: warehouse.id,
          name: warehouse.name,
          location: warehouse.address || 'Non spécifié',
          capacity: total,
          occupied: occupied,
          occupancyRate: occupancyRate,
        };
      });

      return {
        totalWarehouses,
        totalBoxes,
        availableBoxes,
        occupiedBoxes,
        maintenanceBoxes,
        occupancyRate,
        activeReservations,
        warehouseOccupancy,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques d'entrepôts:", error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques de livraisons
   */
  async getDeliveryStats() {
    try {
      // Compter le nombre de livraisons actives (en cours)
      const activeDeliveries = await db.delivery.count({
        where: {
          status: {
            in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'],
          },
        },
      });

      // Compter le nombre de livraisons annulées
      const cancelledDeliveries = await db.delivery.count({ where: { status: 'CANCELLED' } });

      // Date d'aujourd'hui (début de journée)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Livraisons terminées aujourd'hui
      const completedToday = await db.delivery.count({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: today,
          },
        },
      });

      // Date du début de la semaine
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Livraisons terminées cette semaine
      const completedThisWeek = await db.delivery.count({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: startOfWeek,
          },
        },
      });

      // Date du début du mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Livraisons terminées ce mois
      const completedThisMonth = await db.delivery.count({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: startOfMonth,
          },
        },
      });

      // Temps moyen de livraison (simulé pour l'exemple - à remplacer par une vraie requête)
      // Par exemple: temps moyen entre le statut PICKED_UP et DELIVERED en minutes
      const avgDeliveryTime = 45; // 45 minutes par défaut

      return {
        // Données au format attendu par DeliveryStatsCard
        active: activeDeliveries,
        cancelled: cancelledDeliveries,
        completed: {
          today: completedToday,
          thisWeek: completedThisWeek,
          thisMonth: completedThisMonth,
        },
        avgDeliveryTime: avgDeliveryTime,

        // Conserver les anciennes propriétés pour la rétrocompatibilité
        totalDeliveries: activeDeliveries + cancelledDeliveries + completedThisMonth,
        pendingDeliveries: await db.delivery.count({ where: { status: 'PENDING' } }),
        inProgressDeliveries: activeDeliveries,
        completedDeliveries: completedThisMonth,
        deliveriesToday: await db.delivery.count({
          where: {
            createdAt: {
              gte: today,
            },
          },
        }),
        completedToday,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de livraisons:', error);
      throw error;
    }
  },

  /**
   * Récupère les activités récentes
   */
  async getRecentActivities(limit = 10) {
    try {
      // Récents documents soumis
      const recentDocuments = await db.document.findMany({
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          user: true,
        },
      });

      // Récentes livraisons
      const recentDeliveries = await db.delivery.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          deliverer: true,
        },
      });

      // Récentes vérifications
      const recentVerifications = await db.document.findMany({
        where: {
          verificationStatus: {
            in: ['APPROVED', 'REJECTED'],
          },
        },
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          user: true,
          reviewer: true,
        },
      });

      // Récentes inscriptions
      const recentRegistrations = await db.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      // Combiner et trier par date
      const allActivities = [
        ...recentDocuments.map(doc => ({
          type: 'DOCUMENT_SUBMISSION',
          date: doc.uploadedAt,
          data: doc,
        })),
        ...recentDeliveries.map(del => ({
          type: 'DELIVERY',
          date: del.createdAt,
          data: del,
        })),
        ...recentVerifications.map(ver => ({
          type: 'VERIFICATION',
          date: ver.uploadedAt,
          data: ver,
        })),
        ...recentRegistrations.map(reg => ({
          type: 'REGISTRATION',
          date: reg.createdAt,
          data: reg,
        })),
      ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, limit);

      return allActivities;
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes:', error);
      throw error;
    }
  },

  /**
   * Récupère les données pour le graphique d'activité
   */
  async getActivityChartData() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Préparer les tableaux pour stocker les données
      const dates = [];
      const registrationValues = [];
      const deliveryValues = [];
      const transactionValues = [];

      // Générer une date pour chaque jour des 30 derniers jours
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Récupérer les données pour chaque jour
      for (const dateStr of dates) {
        const startDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dateStr);
        endDate.setHours(23, 59, 59, 999);

        // Comptage des inscriptions
        const usersCount = await db.user.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Comptage des livraisons
        const deliveriesCount = await db.delivery.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Comptage des transactions
        const transactionsCount = await db.payment.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        registrationValues.push(usersCount);
        deliveryValues.push(deliveriesCount);
        transactionValues.push(transactionsCount);
      }

      // Formatage des données selon le type ActivityChartData
      const registrations = dates.map((date, i) => ({
        date,
        value: registrationValues[i],
      }));

      const deliveries = dates.map((date, i) => ({
        date,
        value: deliveryValues[i],
      }));

      const transactions = dates.map((date, i) => ({
        date,
        value: transactionValues[i],
      }));

      return {
        deliveries,
        transactions,
        registrations,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des données du graphique d'activité:", error);
      throw error;
    }
  },

  /**
   * Récupère les éléments d'action qui nécessitent l'attention de l'administrateur
   */
  async getActionItems() {
    try {
      // Documents en attente de vérification
      const pendingDocuments = await db.document.count({
        where: {
          verificationStatus: 'PENDING',
        },
      });

      // Utilisateurs en attente de vérification
      const pendingUsers = await db.user.count({
        where: {
          status: 'PENDING_VERIFICATION',
        },
      });

      // Demandes de retrait en attente
      const pendingWithdrawals = await db.withdrawalRequest.count({
        where: {
          status: 'PENDING',
        },
      });

      try {
        // Signalements non traités (si la table report existe)
        return {
          pendingDocuments,
          pendingUsers,
          pendingWithdrawals,
          pendingReports: 0, // Valeur par défaut
        };
      } catch (error) {
        // Si la table report n'existe pas, retourner sans elle
        return {
          pendingDocuments,
          pendingUsers,
          pendingWithdrawals,
        };
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des éléments d'action:", error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques du tableau de bord d'un client
   * @param userId ID de l'utilisateur client
   */
  async getClientDashboardStats(userId: string) {
    try {
      // Récupérer l'utilisateur client
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new Error("L'utilisateur n'est pas un client");
      }

      const clientId = user.client.id;

      // Nombre total de livraisons
      const totalDeliveries = await db.delivery.count({
        where: { clientId },
      });

      // Livraisons en cours
      const activeDeliveriesData = await db.delivery.findMany({
        where: {
          clientId,
          status: {
            in: ['PENDING', 'ACCEPTED', 'IN_TRANSIT'],
          },
        },
        include: {
          deliverer: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      const activeDeliveries = activeDeliveriesData.length;

      // Livraisons terminées
      const completedDeliveries = await db.delivery.count({
        where: {
          clientId,
          status: 'DELIVERED',
        },
      });

      // Services réservés
      const bookedServices = await db.serviceBooking.count({
        where: {
          clientId,
        },
      });

      // Factures impayées
      const unpaidInvoices = await db.invoice.count({
        where: {
          userId,
          status: 'OVERDUE',
        },
      });

      return {
        totalDeliveries,
        activeDeliveries,
        completedDeliveries,
        bookedServices,
        unpaidInvoices,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du client:', error);
      throw error;
    }
  },

  /**
   * Récupère l'activité récente d'un client
   * @param userId ID de l'utilisateur client
   */
  async getClientRecentActivity(userId: string) {
    try {
      // Récupérer l'utilisateur client
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new Error("L'utilisateur n'est pas un client");
      }

      const clientId = user.client.id;

      // Récupérer les 10 dernières livraisons
      const recentDeliveries = await db.delivery.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Récupérer les 10 derniers services réservés
      const recentServices = await db.serviceBooking.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { service: true },
      });

      // Récupérer les 10 dernières factures
      const recentInvoices = await db.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Combiner et trier toutes les activités par date
      const allActivities = [
        ...recentDeliveries.map(delivery => ({
          type: 'DELIVERY',
          id: delivery.id,
          status: delivery.status,
          date: delivery.createdAt,
          data: delivery,
        })),
        ...recentServices.map(booking => ({
          type: 'SERVICE',
          id: booking.id,
          status: booking.status,
          date: booking.createdAt,
          data: {
            ...booking,
            serviceName: booking.service.name,
          },
        })),
        ...recentInvoices.map(invoice => ({
          type: 'INVOICE',
          id: invoice.id,
          status: invoice.status,
          date: invoice.createdAt,
          data: invoice,
        })),
      ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);

      return allActivities;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'activité récente du client:", error);
      throw error;
    }
  },

  /**
   * Récupère les métriques financières d'un client
   * @param userId ID de l'utilisateur client
   */
  async getClientFinancialMetrics(userId: string) {
    try {
      // Montant total dépensé
      const totalSpent = await db.payment.aggregate({
        where: {
          userId,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      });

      // Factures impayées
      const unpaidInvoices = await db.invoice.findMany({
        where: {
          userId,
          status: 'OVERDUE',
        },
      });

      const unpaidAmount = unpaidInvoices.reduce(
        (sum, invoice) => sum + invoice.amount.toNumber(),
        0
      );

      // Dépenses mensuelles (derniers 6 mois)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Au lieu de grouper par mois qui n'est pas un champ existant,
      // on groupe par année et mois en extrayant ces informations de createdAt
      const monthlyPayments = await db.payment.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: {
            gte: sixMonthsAgo,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Calculer les dépenses mensuelles manuellement
      const monthlySpending: Record<string, number> = {};

      monthlyPayments.forEach(payment => {
        const date = payment.createdAt;
        const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!monthlySpending[monthYear]) {
          monthlySpending[monthYear] = 0;
        }

        monthlySpending[monthYear] += payment.amount.toNumber();
      });

      // Convertir en tableau pour le frontend
      const monthlySpendingArray = Object.entries(monthlySpending).map(([monthYear, amount]) => ({
        month: monthYear,
        amount,
      }));

      return {
        totalSpent: totalSpent._sum.amount?.toNumber() || 0,
        unpaidAmount,
        unpaidInvoicesCount: unpaidInvoices.length,
        monthlySpending: monthlySpendingArray,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des métriques financières du client:', error);
      throw error;
    }
  },

  /**
   * Récupère les éléments actifs d'un client (livraisons en cours, réservations à venir)
   * @param userId ID de l'utilisateur client
   */
  async getClientActiveItems(userId: string) {
    try {
      // Récupérer l'utilisateur client
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new Error("L'utilisateur n'est pas un client");
      }

      const clientId = user.client.id;

      // Livraisons actives
      const activeDeliveries = await db.delivery.findMany({
        where: {
          clientId,
          status: {
            in: ['PENDING', 'ACCEPTED', 'IN_TRANSIT'],
          },
        },
        include: {
          deliverer: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Rendez-vous à venir
      const upcomingAppointments = await db.serviceBooking.findMany({
        where: {
          clientId,
          status: 'CONFIRMED',
          startTime: {
            gte: new Date(),
          },
        },
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      // Réservations actives de boxes
      const activeBoxReservations = await db.reservation.findMany({
        where: {
          clientId,
          status: 'ACTIVE',
        },
        include: {
          box: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      return {
        activeDeliveries,
        upcomingAppointments,
        activeBoxReservations,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des éléments actifs du client:', error);
      throw error;
    }
  },

  /**
   * Génère un rapport de ventes
   */
  async getSalesReport({
    startDate,
    endDate,
    granularity,
    comparison,
    categoryFilter,
  }: SalesReportOptions) {
    const endDateFormatted = endDate;
    const startDateFormatted = startDate;

    // Déterminer la période précédente pour comparaison si demandé
    const compareStartDate = comparison
      ? new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
      : null;
    const compareEndDate = comparison ? startDate : null;

    try {
      // Requête principale pour les ventes de la période sélectionnée
      let salesQuery = await db.invoice.findMany({
        where: {
          createdAt: {
            gte: startDateFormatted,
            lte: endDateFormatted,
          },
          status: 'PAID',
          ...(categoryFilter ? { category: categoryFilter } : {}),
        },
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
          status: true,
          category: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Données pour comparaison avec période précédente si demandé
      let comparisonData = null;
      if (comparison && compareStartDate && compareEndDate) {
        comparisonData = await db.invoice.findMany({
          where: {
            createdAt: {
              gte: compareStartDate,
              lte: compareEndDate,
            },
            status: 'PAID',
            ...(categoryFilter ? { category: categoryFilter } : {}),
          },
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            status: true,
            category: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }

      // Analyse et agrégation des données par période (jour, semaine, mois...)
      const timeSeriesData = aggregateTimeSeriesData(salesQuery, granularity, 'totalAmount');
      const comparisonTimeSeriesData = comparisonData
        ? aggregateTimeSeriesData(comparisonData, granularity, 'totalAmount')
        : null;

      // Agréger les données par catégorie
      const salesByCategory = await db.invoice.groupBy({
        by: ['category'],
        where: {
          createdAt: {
            gte: startDateFormatted,
            lte: endDateFormatted,
          },
          status: 'PAID',
        },
        _sum: {
          totalAmount: true,
        },
        orderBy: {
          _sum: {
            totalAmount: 'desc',
          },
        },
      });

      // Calcul des totaux et des comparaisons
      const totalSales = salesQuery.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
      const previousTotalSales = comparisonData
        ? comparisonData.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0)
        : 0;

      const percentChange =
        previousTotalSales > 0 ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 : 0;

      return {
        timeSeriesData,
        comparisonTimeSeriesData,
        salesByCategory: salesByCategory.map(category => ({
          name: category.category || 'Non catégorisé',
          value: Number(category._sum.totalAmount),
        })),
        summary: {
          totalSales,
          numberOfInvoices: salesQuery.length,
          previousTotalSales: comparison ? previousTotalSales : null,
          percentChange: comparison ? percentChange : null,
          averageOrderValue: salesQuery.length > 0 ? totalSales / salesQuery.length : 0,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de ventes:', error);
      throw error;
    }
  },

  /**
   * Génère un rapport d'activité utilisateur
   */
  async getUserActivityReport({
    startDate,
    endDate,
    granularity,
    comparison,
    userRoleFilter,
  }: UserActivityReportOptions) {
    const endDateFormatted = endDate;
    const startDateFormatted = startDate;

    // Déterminer la période précédente pour comparaison si demandé
    const compareStartDate = comparison
      ? new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
      : null;
    const compareEndDate = comparison ? startDate : null;

    try {
      // Requête pour les inscriptions d'utilisateurs
      const userSignupsQuery = await db.user.findMany({
        where: {
          createdAt: {
            gte: startDateFormatted,
            lte: endDateFormatted,
          },
          ...(userRoleFilter ? { role: userRoleFilter as any } : {}),
        },
        select: {
          id: true,
          createdAt: true,
          role: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Requête pour les connexions d'utilisateurs
      const userLoginsQuery = await db.session.findMany({
        where: {
          createdAt: {
            gte: startDateFormatted,
            lte: endDateFormatted,
          },
          user: userRoleFilter ? { role: userRoleFilter as any } : undefined,
        },
        select: {
          id: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Données de comparaison
      let comparisonSignups = null;
      let comparisonLogins = null;

      if (comparison && compareStartDate && compareEndDate) {
        comparisonSignups = await db.user.findMany({
          where: {
            createdAt: {
              gte: compareStartDate,
              lte: compareEndDate,
            },
            ...(userRoleFilter ? { role: userRoleFilter as any } : {}),
          },
          select: {
            id: true,
            createdAt: true,
            role: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        comparisonLogins = await db.session.findMany({
          where: {
            createdAt: {
              gte: compareStartDate,
              lte: compareEndDate,
            },
            user: userRoleFilter ? { role: userRoleFilter as any } : undefined,
          },
          select: {
            id: true,
            userId: true,
            createdAt: true,
            user: {
              select: {
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }

      // Agréger les données d'inscriptions par période
      const signupsTimeSeriesData = aggregateTimeSeriesData(userSignupsQuery, granularity, 'count');
      const comparisonSignupsData = comparisonSignups
        ? aggregateTimeSeriesData(comparisonSignups, granularity, 'count')
        : null;

      // Agréger les données de connexions par période
      const loginsTimeSeriesData = aggregateTimeSeriesData(userLoginsQuery, granularity, 'count');
      const comparisonLoginsData = comparisonLogins
        ? aggregateTimeSeriesData(comparisonLogins, granularity, 'count')
        : null;

      // Analyser par rôle si pas de filtre
      const usersByRole = !userRoleFilter
        ? await db.user.groupBy({
            by: ['role'],
            where: {
              createdAt: {
                gte: startDateFormatted,
                lte: endDateFormatted,
              },
            },
            _count: true,
          })
        : [];

      // Calculer les utilisateurs actifs (ayant eu au moins une session)
      const activeUserIds = new Set(userLoginsQuery.map(login => login.userId));
      const activeUsersCount = activeUserIds.size;

      // Calculer les totaux et comparaisons
      const totalSignups = userSignupsQuery.length;
      const previousTotalSignups = comparisonSignups ? comparisonSignups.length : 0;
      const signupsPercentChange =
        previousTotalSignups > 0
          ? ((totalSignups - previousTotalSignups) / previousTotalSignups) * 100
          : 0;

      return {
        signupsTimeSeriesData,
        comparisonSignupsData,
        loginsTimeSeriesData,
        comparisonLoginsData,
        usersByRole: usersByRole.map(role => ({
          role: role.role,
          count: role._count,
        })),
        summary: {
          totalSignups,
          activeUsers: activeUsersCount,
          previousTotalSignups: comparison ? previousTotalSignups : null,
          signupsPercentChange: comparison ? signupsPercentChange : null,
          totalLogins: userLoginsQuery.length,
          uniqueLogins: activeUsersCount,
        },
      };
    } catch (error) {
      console.error("Erreur lors de la génération du rapport d'activité utilisateur:", error);
      throw error;
    }
  },

  /**
   * Génère un rapport de performance de livraison
   */
  async getDeliveryPerformanceReport({
    startDate,
    endDate,
    granularity,
    comparison,
    zoneFilter,
    delivererFilter,
  }: DeliveryPerformanceReportOptions) {
    const endDateFormatted = endDate;
    const startDateFormatted = startDate;

    // Déterminer la période précédente pour comparaison si demandé
    const compareStartDate = comparison
      ? new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
      : null;
    const compareEndDate = comparison ? startDate : null;

    try {
      // Requête pour les livraisons
      const deliveriesQuery = await db.delivery.findMany({
        where: {
          createdAt: {
            gte: startDateFormatted,
            lte: endDateFormatted,
          },
          ...(zoneFilter ? { zone: zoneFilter } : {}),
          ...(delivererFilter ? { delivererId: delivererFilter } : {}),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          completedAt: true,
          estimatedDeliveryTime: true,
          actualDeliveryTime: true,
          zone: true,
          delivererId: true,
          deliverer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Données de comparaison
      let comparisonDeliveries = null;

      if (comparison && compareStartDate && compareEndDate) {
        comparisonDeliveries = await db.delivery.findMany({
          where: {
            createdAt: {
              gte: compareStartDate,
              lte: compareEndDate,
            },
            ...(zoneFilter ? { zone: zoneFilter } : {}),
            ...(delivererFilter ? { delivererId: delivererFilter } : {}),
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            estimatedDeliveryTime: true,
            actualDeliveryTime: true,
            zone: true,
            delivererId: true,
            deliverer: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
      }

      // Calculer les livraisons à temps vs en retard
      const completedDeliveries = deliveriesQuery.filter(
        d => d.status === 'DELIVERED' && d.estimatedDeliveryTime && d.actualDeliveryTime
      );
      const onTimeDeliveries = completedDeliveries.filter(d => {
        const estimated = new Date(d.estimatedDeliveryTime!);
        const actual = new Date(d.actualDeliveryTime!);
        return actual <= estimated;
      });

      // Temps de livraison moyen par zone
      const deliveryTimesByZone = await db.$queryRaw`
        SELECT 
          zone,
          EXTRACT(EPOCH FROM AVG(actual_delivery_time - created_at))/60 as average_time
        FROM delivery
        WHERE 
          created_at BETWEEN ${startDateFormatted} AND ${endDateFormatted}
          AND status = 'DELIVERED'
          AND actual_delivery_time IS NOT NULL
          ${zoneFilter ? Prisma.sql`AND zone = ${zoneFilter}` : Prisma.sql``}
          ${delivererFilter ? Prisma.sql`AND deliverer_id = ${delivererFilter}` : Prisma.sql``}
        GROUP BY zone
        ORDER BY average_time ASC
      `;

      // Problèmes par type
      const deliveryIssues = await db.$queryRaw`
        SELECT 
          issue_type,
          COUNT(*) as count
        FROM delivery_issue
        WHERE 
          created_at BETWEEN ${startDateFormatted} AND ${endDateFormatted}
          ${
            delivererFilter
              ? Prisma.sql`AND delivery_id IN (
            SELECT id FROM delivery WHERE deliverer_id = ${delivererFilter}
          )`
              : Prisma.sql``
          }
          ${
            zoneFilter
              ? Prisma.sql`AND delivery_id IN (
            SELECT id FROM delivery WHERE zone = ${zoneFilter}
          )`
              : Prisma.sql``
          }
        GROUP BY issue_type
        ORDER BY count DESC
      `;

      // Agréger les données de livraison par période
      const deliveriesTimeSeriesData = aggregateTimeSeriesData(
        deliveriesQuery,
        granularity,
        'count'
      );

      // Agréger les livraisons à temps par période
      const onTimeDeliveriesData =
        onTimeDeliveries.length > 0
          ? aggregateTimeSeriesData(onTimeDeliveries, granularity, 'count')
          : [];

      // Calculer le taux de livraison à temps par période
      const onTimeDeliveryRate = deliveriesTimeSeriesData.map(period => {
        const totalForPeriod = period.value;
        const onTimeForPeriod =
          onTimeDeliveriesData.find(p => p.period === period.period)?.value || 0;
        const rate = totalForPeriod > 0 ? (onTimeForPeriod / totalForPeriod) * 100 : 0;

        return {
          period: period.period,
          rate: rate,
        };
      });

      // Données de comparaison pour le taux de livraison à temps
      let previousOnTimePercentage = null;
      if (comparisonDeliveries) {
        const prevCompletedDeliveries = comparisonDeliveries.filter(
          d => d.status === 'DELIVERED' && d.estimatedDeliveryTime && d.actualDeliveryTime
        );
        const prevOnTimeDeliveries = prevCompletedDeliveries.filter(d => {
          const estimated = new Date(d.estimatedDeliveryTime!);
          const actual = new Date(d.actualDeliveryTime!);
          return actual <= estimated;
        });

        previousOnTimePercentage =
          prevCompletedDeliveries.length > 0
            ? (prevOnTimeDeliveries.length / prevCompletedDeliveries.length) * 100
            : 0;
      }

      // Calculer le taux de livraison à temps global
      const onTimePercentage =
        completedDeliveries.length > 0
          ? (onTimeDeliveries.length / completedDeliveries.length) * 100
          : 0;

      // Calculer le changement de pourcentage
      const percentChange =
        previousOnTimePercentage !== null ? onTimePercentage - previousOnTimePercentage : 0;

      // Calculer le temps moyen de livraison
      const averageDeliveryTimeInMinutes =
        completedDeliveries.length > 0
          ? completedDeliveries.reduce((sum, delivery) => {
              if (delivery.actualDeliveryTime && delivery.createdAt) {
                const createdAt = new Date(delivery.createdAt);
                const completedAt = new Date(delivery.actualDeliveryTime);
                return sum + (completedAt.getTime() - createdAt.getTime()) / (1000 * 60);
              }
              return sum;
            }, 0) / completedDeliveries.length
          : 0;

      // Calculer le taux de problèmes
      const issueCount = await db.deliveryIssue.count({
        where: {
          createdAt: {
            gte: startDateFormatted,
            lte: endDateFormatted,
          },
          delivery: {
            ...(zoneFilter ? { zone: zoneFilter } : {}),
            ...(delivererFilter ? { delivererId: delivererFilter } : {}),
          },
        },
      });

      const issueRate =
        deliveriesQuery.length > 0 ? (issueCount / deliveriesQuery.length) * 100 : 0;

      // Calculer le taux d'annulation
      const cancelledDeliveries = deliveriesQuery.filter(d => d.status === 'CANCELLED').length;
      const cancelRate =
        deliveriesQuery.length > 0 ? (cancelledDeliveries / deliveriesQuery.length) * 100 : 0;

      return {
        onTimeDeliveryRate,
        deliveryTimesByZone: deliveryTimesByZone.map((zone: any, index: number) => ({
          zone: zone.zone,
          averageTime: parseFloat(zone.average_time),
          color: index % 2 === 0 ? '#8884d8' : '#82ca9d',
        })),
        deliveryIssues: (deliveryIssues as any[]).map((issue, index) => ({
          issueType: issue.issue_type,
          count: parseInt(issue.count, 10),
          percentage: (parseInt(issue.count, 10) / issueCount) * 100,
          color: getColorByIndex(index),
        })),
        deliveriesByStatus: [
          {
            status: 'DELIVERED',
            count: deliveriesQuery.filter(d => d.status === 'DELIVERED').length,
            color: '#4CAF50',
          },
          {
            status: 'IN_TRANSIT',
            count: deliveriesQuery.filter(d => d.status === 'IN_TRANSIT').length,
            color: '#2196F3',
          },
          {
            status: 'PENDING',
            count: deliveriesQuery.filter(d => d.status === 'PENDING').length,
            color: '#FFC107',
          },
          {
            status: 'CANCELLED',
            count: deliveriesQuery.filter(d => d.status === 'CANCELLED').length,
            color: '#F44336',
          },
          {
            status: 'PROBLEM',
            count: deliveriesQuery.filter(d => d.status === 'PROBLEM').length,
            color: '#FF5722',
          },
        ],
        performanceSummary: {
          totalDeliveries: deliveriesQuery.length,
          onTimePercentage,
          previousOnTimePercentage: comparison ? previousOnTimePercentage : null,
          percentChange,
          averageDeliveryTime: averageDeliveryTimeInMinutes,
          issueRate,
          cancelRate,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de performance de livraison:', error);
      throw error;
    }
  },
};

/**
 * Fonction utilitaire pour agréger des données par période (jour, semaine, mois...)
 */
function aggregateTimeSeriesData(data: any[], granularity: string, valueField: string = 'count') {
  if (!data || data.length === 0) return [];

  const result: { period: string; value: number }[] = [];
  const groupedData: Record<string, any[]> = {};

  // Regrouper les données par la période spécifiée
  data.forEach(item => {
    const date = new Date(item.createdAt);
    let periodKey: string;

    switch (granularity) {
      case 'day':
        periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Début de la semaine (dimanche)
        periodKey = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        periodKey = `${date.getFullYear()}`;
        break;
      default:
        periodKey = date.toISOString().split('T')[0]; // Par défaut: jour
    }

    if (!groupedData[periodKey]) {
      groupedData[periodKey] = [];
    }

    groupedData[periodKey].push(item);
  });

  // Calculer la valeur pour chaque période
  Object.entries(groupedData).forEach(([period, items]) => {
    let value: number;

    if (valueField === 'count') {
      value = items.length;
    } else {
      // Somme des valeurs numériques
      value = items.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);
    }

    result.push({ period, value });
  });

  // Trier par période
  result.sort((a, b) => a.period.localeCompare(b.period));

  return result;
}

/**
 * Fonction utilitaire pour obtenir une couleur en fonction de l'index
 */
function getColorByIndex(index: number): string {
  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff8042',
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8844d8',
    '#41ca9d',
    '#eec658',
    '#ef8042',
  ];

  return colors[index % colors.length];
}
