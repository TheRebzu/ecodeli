import { db } from "@/server/db";
import { UserRole, UserStatus } from "@prisma/client";

/**
 * Service pour la gestion administrative des livreurs
 */
export const delivererAdminService = {
  /**
   * Récupère la liste des livreurs avec pagination et filtres
   */
  async getDeliverers({
    page = 1,
    limit = 10,
    search,
    status}: {
    page?: number;
    limit?: number;
    search?: string;
    status?: UserStatus;
  }) {
    const skip = (page - 1) * limit;

    const where: any = {
      role: UserRole.DELIVERER};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }];
    }

    if (status) {
      where.status = status;
    }

    const [deliverers, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          status: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          phoneNumber: true,
          delivererDeliveries: {
            select: {
              id: true,
              status: true,
              ratings: {
                select: { rating }}}},
          wallet: {
            select: { balance }},
          documents: {
            select: { verificationStatus }}},
        orderBy: {
          createdAt: "desc"}}),
      db.user.count({ where  })]);

    const transformedDeliverers = deliverers.map((deliverer) => {
      const completedDeliveries = deliverer.delivererDeliveries.filter(
        (d) => d.status === "DELIVERED",
      ).length;
      const totalDeliveries = deliverer.delivererDeliveries.length;

      // Calculer la vraie moyenne des ratings depuis la base de données
      const ratingStats = await db.rating.aggregate({
        where: { targetId: deliverer.id, targetType: "DELIVERER" },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const averageRating = ratingStats._avg.rating || 0;
      const totalRatings = ratingStats._count.rating || 0;

      let verificationStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
      if (deliverer.isVerified) {
        verificationStatus = "APPROVED";
      } else {
        const hasRejectedDoc = deliverer.documents.some(
          (doc) => doc.verificationStatus === "REJECTED",
        );
        if (hasRejectedDoc) {
          verificationStatus = "REJECTED";
        }
      }

      // Séparer le nom complet en prénom et nom
      const nameParts = deliverer.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      return {
        id: deliverer.id,
        firstName,
        lastName,
        email: deliverer.email,
        phone: deliverer.phoneNumber,
        image: deliverer.image,
        status: deliverer.status,
        isVerified: deliverer.isVerified,
        verificationStatus,
        createdAt: deliverer.createdAt,
        lastActiveAt: deliverer.lastLoginAt,
        totalDeliveries,
        completedDeliveries,
        rating: averageRating,
        totalRatings,
        earnings: deliverer.wallet?.balance || 0,
        hasVehicle: false,
        vehicleType: undefined,
        preferredZones: [],
        cancelledDeliveries: 0};
    });

    return {
      deliverers: transformedDeliverers,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page};
  },

  /**
   * Récupère les statistiques des livreurs
   */
  async getDeliverersStats() {
    try {
      const [
        totalDeliverers,
        activeDeliverers,
        verifiedDeliverers,
        pendingVerification,
        suspendedDeliverers,
        deliveryStats,
        ratingStats,
        walletStats,
      ] = await Promise.all([
        db.user.count({
          where: { role: UserRole.DELIVERER },
        }),
        db.user.count({
          where: {
            role: UserRole.DELIVERER,
            status: UserStatus.ACTIVE,
          },
        }),
        db.user.count({
          where: {
            role: UserRole.DELIVERER,
            isVerified: true,
          },
        }),
        db.user.count({
          where: {
            role: UserRole.DELIVERER,
            isVerified: false,
          },
        }),
        db.user.count({
          where: {
            role: UserRole.DELIVERER,
            status: UserStatus.SUSPENDED,
          },
        }),
        db.delivery.aggregate({
          _count: { id: true },
          where: {
            deliverer: {
              role: UserRole.DELIVERER,
            },
          },
        }),
        // Calculer la vraie moyenne des ratings pour tous les livreurs
        db.rating.aggregate({
          _avg: { rating: true },
          _count: { rating: true },
          where: {
            targetType: "DELIVERER",
            deliverer: {
              role: UserRole.DELIVERER,
            },
          },
        }),
        // Calculer la moyenne des gains
        db.wallet.aggregate({
          _avg: { balance: true },
          where: {
            user: {
              role: UserRole.DELIVERER,
            },
          },
        }),
      ]);

      // Calculer les livreurs avec véhicule
      const vehicledDeliverers = await db.user.count({
        where: {
          role: UserRole.DELIVERER,
          deliverer: {
            vehicleType: { not: null },
          },
        },
      });

      // Récupérer les top performers (livreurs avec les meilleures notes)
      const topPerformers = await db.user.findMany({
        where: { role: UserRole.DELIVERER },
        include: {
          _count: {
            select: { receivedRatings: true },
          },
          receivedRatings: {
            select: { rating: true },
          },
        },
        take: 5,
      });

      const topPerformersFormatted = topPerformers
        .map((deliverer) => {
          const avgRating =
            deliverer.receivedRatings.length > 0
              ? deliverer.receivedRatings.reduce((sum, r) => sum + r.rating, 0) /
                deliverer.receivedRatings.length
              : 0;
          return {
            id: deliverer.id,
            name: deliverer.name,
            rating: avgRating,
            totalRatings: deliverer.receivedRatings.length,
          };
        })
        .sort((a, b) => b.rating - a.rating);

      // Calculer le taux de croissance réel basé sur les inscriptions des 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const [recentSignups, previousSignups] = await Promise.all([
        db.user.count({
          where: {
            role: UserRole.DELIVERER,
            createdAt: { gte: thirtyDaysAgo }
          }
        }),
        db.user.count({
          where: {
            role: UserRole.DELIVERER,
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
          }
        })
      ]);

      const growthRate = previousSignups > 0 
        ? ((recentSignups - previousSignups) / previousSignups) * 100
        : recentSignups > 0 ? 100 : 0;

      // Calculer le nombre de zones actives basé sur les livraisons uniques par ville
      const activeZonesResult = await db.delivery.groupBy({
        by: ['pickupCity', 'deliveryCity'],
        where: {
          deliverer: { role: UserRole.DELIVERER },
          status: { in: ['IN_PROGRESS', 'COMPLETED'] },
          createdAt: { gte: thirtyDaysAgo }
        }
      });

      // Compter les villes uniques (pickup et delivery combinées)
      const uniqueCities = new Set();
      activeZonesResult.forEach(result => {
        if (result.pickupCity) uniqueCities.add(result.pickupCity);
        if (result.deliveryCity) uniqueCities.add(result.deliveryCity);
      });
      const activeZones = uniqueCities.size;

      const result = {
        totalDeliverers,
        activeDeliverers,
        verifiedDeliverers,
        pendingVerification,
        suspendedDeliverers,
        averageRating: ratingStats._avg.rating || 0,
        totalDeliveries: deliveryStats._count.id || 0,
        averageEarnings: walletStats._avg.balance || 0,
        vehicledDeliverers,
        topPerformers: topPerformersFormatted,
        growthRate,
        activeZones,
      };

      console.log("📊 Stats livreurs:", result);
      return result;
    } catch (error) {
      console.error("❌ Erreur dans getDeliverersStats:", error);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        totalDeliverers: 0,
        activeDeliverers: 0,
        verifiedDeliverers: 0,
        pendingVerification: 0,
        suspendedDeliverers: 0,
        averageRating: 0,
        totalDeliveries: 0,
        averageEarnings: 0,
        vehicledDeliverers: 0,
        topPerformers: [],
        growthRate: 0,
        activeZones: 0,
      };
    }
  },

  /**
   * Met à jour le statut d'un livreur
   */
  async updateDelivererStatus(delivererId: string, status: UserStatus) {
    return await db.user.update({
      where: {
        id: delivererId,
        role: UserRole.DELIVERER},
      data: {
        status,
        updatedAt: new Date()}});
  },

  /**
   * Vérifie un livreur
   */
  async verifyDeliverer(delivererId: string) {
    return await db.user.update({
      where: {
        id: delivererId,
        role: UserRole.DELIVERER},
      data: {
        isVerified: true,
        updatedAt: new Date()}});
  },

  /**
   * Récupère les détails d'un livreur
   */
  async getDelivererDetails(delivererId: string) {
    const deliverer = await db.user.findUnique({
      where: {
        id: delivererId,
        role: UserRole.DELIVERER},
      include: {
        deliverer: true,
        delivererDeliveries: {
          include: {
            client: {
              select: {
                name: true,
                email: true}}},
          orderBy: {
            createdAt: "desc"},
          take: 10},
        documents: {
          orderBy: {
            uploadedAt: "desc"}},
        wallet: true}});

    if (!deliverer) {
      throw new Error("Livreur non trouvé");
    }

    return deliverer;
  }};
