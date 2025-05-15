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
      const userStats = await this.getUserStats();
      const documentStats = await this.getDocumentStats();
      const transactionStats = await this.getTransactionStats();
      const warehouseStats = await this.getWarehouseStats();
      const deliveryStats = await this.getDeliveryStats();
      const recentActivities = await this.getRecentActivities(10);
      const activityChartData = await this.getActivityChartData();
      const actionItems = await this.getActionItems();

      return {
        userStats,
        documentStats,
        transactionStats,
        warehouseStats,
        deliveryStats,
        recentActivities,
        activityChartData,
        actionItems
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
      const pendingVerifications = await db.user.count({ where: { status: 'PENDING_VERIFICATION' } });
      
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
            gte: today
          }
        }
      });

      // Nouveaux utilisateurs (cette semaine)
      const startOfWeek = new Date();
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const newUsersThisWeek = await db.user.count({
        where: {
          createdAt: {
            gte: startOfWeek
          }
        }
      });

      // Nouveaux utilisateurs (ce mois)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const newUsersThisMonth = await db.user.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      });

      return {
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
          ADMIN: adminCount
        }
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
        where: { verificationStatus: 'PENDING' } 
      });
      const approved = await db.document.count({ 
        where: { verificationStatus: 'APPROVED' } 
      });
      const rejected = await db.document.count({ 
        where: { verificationStatus: 'REJECTED' } 
      });

      // Documents par type
      const idCards = await db.document.count({ 
        where: { type: 'ID_CARD' } 
      });
      const drivingLicenses = await db.document.count({ 
        where: { type: 'DRIVING_LICENSE' } 
      });
      const vehicleRegistrations = await db.document.count({ 
        where: { type: 'VEHICLE_REGISTRATION' } 
      });
      const insurances = await db.document.count({ 
        where: { type: 'INSURANCE' } 
      });
      const proofOfAddress = await db.document.count({ 
        where: { type: 'PROOF_OF_ADDRESS' } 
      });
      const others = await db.document.count({ 
        where: { type: 'OTHER' } 
      });

      // Documents soumis aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const submittedToday = await db.document.count({
        where: {
          uploadedAt: {
            gte: today
          }
        }
      });

      return {
        totalDocuments,
        pendingReview,
        approved,
        rejected,
        submittedToday,
        documentsByType: {
          ID_CARD: idCards,
          DRIVING_LICENSE: drivingLicenses,
          VEHICLE_REGISTRATION: vehicleRegistrations,
          INSURANCE: insurances,
          PROOF_OF_ADDRESS: proofOfAddress,
          OTHER: others
        }
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
          amount: true
        }
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
            gte: thirtyDaysAgo
          }
        }
      });

      const last30DaysAmount = await db.payment.aggregate({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        _sum: {
          amount: true
        }
      });

      return {
        totalPayments,
        totalAmount: totalAmount._sum.amount?.toNumber() || 0,
        last30DaysPayments,
        last30DaysAmount: last30DaysAmount._sum.amount?.toNumber() || 0,
        paymentsByStatus: {
          COMPLETED: successful,
          PENDING: pending,
          FAILED: failed
        }
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
            gte: new Date()
          }
        }
      });

      return {
        totalWarehouses,
        totalBoxes,
        availableBoxes,
        occupiedBoxes,
        maintenanceBoxes,
        occupancyRate,
        activeReservations
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques d\'entrepôts:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques de livraisons
   */
  async getDeliveryStats() {
    try {
      const totalDeliveries = await db.delivery.count();
      const pendingDeliveries = await db.delivery.count({ where: { status: 'PENDING' } });
      const inProgressDeliveries = await db.delivery.count({
        where: {
          status: {
            in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
          }
        }
      });
      const completedDeliveries = await db.delivery.count({ where: { status: 'DELIVERED' } });
      const cancelledDeliveries = await db.delivery.count({ where: { status: 'CANCELLED' } });

      // Livraisons aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deliveriesToday = await db.delivery.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      });

      // Livraisons terminées aujourd'hui
      const completedToday = await db.delivery.count({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: today
          }
        }
      });

      return {
        totalDeliveries,
        pendingDeliveries,
        inProgressDeliveries,
        completedDeliveries,
        cancelledDeliveries,
        deliveriesToday,
        completedToday
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
          user: true
        }
      });

      // Récentes livraisons
      const recentDeliveries = await db.delivery.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          deliverer: true
        }
      });

      // Récentes vérifications
      const recentVerifications = await db.document.findMany({
        where: {
          verificationStatus: {
            in: ['APPROVED', 'REJECTED']
          }
        },
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          user: true,
          reviewer: true
        }
      });

      // Récentes inscriptions
      const recentRegistrations = await db.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      // Combiner et trier par date
      const allActivities = [
        ...recentDocuments.map(doc => ({
          type: 'DOCUMENT_SUBMISSION',
          date: doc.uploadedAt,
          data: doc
        })),
        ...recentDeliveries.map(del => ({
          type: 'DELIVERY',
          date: del.createdAt,
          data: del
        })),
        ...recentVerifications.map(ver => ({
          type: 'VERIFICATION',
          date: ver.uploadedAt,
          data: ver
        })),
        ...recentRegistrations.map(reg => ({
          type: 'REGISTRATION',
          date: reg.createdAt,
          data: reg
        }))
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
      const registrations = [];
      const deliveries = [];
      const documents = [];

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
              lte: endDate
            }
          }
        });

        // Comptage des livraisons
        const deliveriesCount = await db.delivery.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        // Comptage des documents
        const documentsCount = await db.document.count({
          where: {
            uploadedAt: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        registrations.push(usersCount);
        deliveries.push(deliveriesCount);
        documents.push(documentsCount);
      }

      return {
        labels: dates,
        datasets: [
          {
            label: 'Inscriptions',
            data: registrations
          },
          {
            label: 'Livraisons',
            data: deliveries
          },
          {
            label: 'Documents',
            data: documents
          }
        ]
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données du graphique d\'activité:', error);
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
          verificationStatus: 'PENDING'
        }
      });

      // Utilisateurs en attente de vérification
      const pendingUsers = await db.user.count({
        where: {
          status: 'PENDING_VERIFICATION'
        }
      });

      // Demandes de retrait en attente
      const pendingWithdrawals = await db.withdrawalRequest.count({
        where: {
          status: 'PENDING'
        }
      });

      try {
        // Signalements non traités (si la table report existe)
        return {
          pendingDocuments,
          pendingUsers,
          pendingWithdrawals,
          pendingReports: 0 // Valeur par défaut
        };
      } catch (error) {
        // Si la table report n'existe pas, retourner sans elle
        return {
          pendingDocuments,
          pendingUsers,
          pendingWithdrawals
        };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des éléments d\'action:', error);
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
      ].sort((a, b) => b.date.getTime() - a.date.getTime())
       .slice(0, 10);

      return allActivities;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'activité récente du client:', error);
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
}; 