import { db } from '@/server/db';
import { UserRole, UserStatus } from '@prisma/client';

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
    status,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    status?: UserStatus;
  }) {
    const skip = (page - 1) * limit;

    const where: any = {
      role: UserRole.DELIVERER,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [deliverers, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          delivererDeliveries: {
            select: {
              id: true,
              status: true,
              rating: true,
            },
          },
          wallet: {
            select: {
              balance: true,
            },
          },
          documents: {
            select: {
              verificationStatus: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      db.user.count({ where }),
    ]);

    const transformedDeliverers = deliverers.map((deliverer) => {
      const completedDeliveries = deliverer.deliveries.filter(
        (d) => d.status === 'DELIVERED'
      ).length;
      const totalDeliveries = deliverer.deliveries.length;
      const ratings = deliverer.deliveries
        .filter((d) => d.rating !== null)
        .map((d) => d.rating!);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;

      let verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
      if (deliverer.isVerified) {
        verificationStatus = 'APPROVED';
      } else {
        const hasRejectedDoc = deliverer.documents.some(
          (doc) => doc.verificationStatus === 'REJECTED'
        );
        if (hasRejectedDoc) {
          verificationStatus = 'REJECTED';
        }
      }

      return {
        id: deliverer.id,
        firstName: deliverer.firstName || '',
        lastName: deliverer.lastName || '',
        email: deliverer.email,
        phone: deliverer.phone,
        image: deliverer.image,
        status: deliverer.status,
        isVerified: deliverer.isVerified,
        verificationStatus,
        createdAt: deliverer.createdAt,
        lastActiveAt: deliverer.lastActiveAt,
        totalDeliveries,
        completedDeliveries,
        rating: averageRating,
        earnings: deliverer.wallet?.balance || 0,
        hasVehicle: false,
        vehicleType: undefined,
        preferredZones: [],
      };
    });

    return {
      deliverers: transformedDeliverers,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  },

  /**
   * Récupère les statistiques des livreurs
   */
  async getDeliverersStats() {
    const [
      totalDeliverers,
      activeDeliverers,
      verifiedDeliverers,
      pendingVerification,
      suspendedDeliverers,
      deliveryStats,
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
        _avg: { rating: true },
        where: {
          deliverer: {
            role: UserRole.DELIVERER,
          },
        },
      }),
    ]);

    return {
      totalDeliverers,
      activeDeliverers,
      verifiedDeliverers,
      pendingVerification,
      suspendedDeliverers,
      averageRating: deliveryStats._avg.rating || 0,
      totalDeliveries: deliveryStats._count.id || 0,
      averageEarnings: 850,
      vehicledDeliverers: 0,
      topPerformers: [],
      growthRate: 12.5,
      activeZones: 25,
    };
  },

  /**
   * Met à jour le statut d'un livreur
   */
  async updateDelivererStatus(delivererId: string, status: UserStatus) {
    return await db.user.update({
      where: {
        id: delivererId,
        role: UserRole.DELIVERER,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Vérifie un livreur
   */
  async verifyDeliverer(delivererId: string) {
    return await db.user.update({
      where: {
        id: delivererId,
        role: UserRole.DELIVERER,
      },
      data: {
        isVerified: true,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Récupère les détails d'un livreur
   */
  async getDelivererDetails(delivererId: string) {
    const deliverer = await db.user.findUnique({
      where: {
        id: delivererId,
        role: UserRole.DELIVERER,
      },
      include: {
        delivererProfile: {
          include: {
            preferences: true,
            routes: true,
          },
        },
        deliveries: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        documents: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        wallet: true,
      },
    });

    if (!deliverer) {
      throw new Error('Livreur non trouvé');
    }

    return deliverer;
  },
}; 