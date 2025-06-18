import { PrismaClient } from '@prisma/client';

export interface DeliveryMetrics {
  totalDeliveries: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  averageRating: number;
  activeDeliverers: number;
  busyDeliverers: number;
  totalDistance: number;
  averageDistance: number;
  totalRevenue: number;
}

export interface DeliveryPerformance {
  delivererId: string;
  delivererName: string;
  totalDeliveries: number;
  completedDeliveries: number;
  averageRating: number;
  averageTime: number;
  onTimeRate: number;
  totalEarnings: number;
  rank: number;
}

export interface ZoneStats {
  zoneId: string;
  zoneName: string;
  totalDeliveries: number;
  averageTime: number;
  popularityScore: number;
  averageRating: number;
  totalRevenue: number;
}

/**
 * Service pour les analytics de livraison
 * Remplace les données mockées dans delivery-analytics.tsx
 */
export class DeliveryAnalyticsService {
  constructor(private db: PrismaClient) {}

  /**
   * Récupérer les métriques de livraison
   */
  async getDeliveryMetrics(timeRange: string): Promise<DeliveryMetrics> {
    try {
      const dateFilter = this.getDateFilter(timeRange);

      // Récupérer les données de livraison
      const deliveries = await this.db.delivery.findMany({
        where: {
          createdAt: dateFilter,
        },
        include: {
          deliverer: true,
          ratings: true,
        },
      });

      // Calculer les métriques
      const totalDeliveries = deliveries.length;
      const completedDeliveries = deliveries.filter(d => d.status === 'COMPLETED').length;
      const pendingDeliveries = deliveries.filter(d => d.status === 'PENDING').length;
      const cancelledDeliveries = deliveries.filter(d => d.status === 'CANCELLED').length;

      // Calculer le temps moyen de livraison (en minutes)
      const completedWithTime = deliveries.filter(d => 
        d.status === 'COMPLETED' && d.deliveredAt && d.createdAt
      );
      const averageDeliveryTime = completedWithTime.length > 0 
        ? completedWithTime.reduce((sum, d) => {
            const timeMs = d.deliveredAt!.getTime() - d.createdAt.getTime();
            return sum + (timeMs / (1000 * 60)); // Convert to minutes
          }, 0) / completedWithTime.length
        : 0;

      // Calculer le taux de livraison à temps (moins de 45 minutes)
      const onTimeDeliveries = completedWithTime.filter(d => {
        const timeMs = d.deliveredAt!.getTime() - d.createdAt.getTime();
        return (timeMs / (1000 * 60)) <= 45;
      });
      const onTimeDeliveryRate = completedWithTime.length > 0 
        ? (onTimeDeliveries.length / completedWithTime.length) * 100
        : 0;

      // Calculer la note moyenne
      const allRatings = deliveries.flatMap(d => d.ratings);
      const averageRating = allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        : 0;

      // Calculer les statistiques des livreurs
      const activeDeliverers = await this.db.user.count({
        where: {
          role: 'DELIVERER',
          deliverer: {
            status: 'ACTIVE',
          },
        },
      });

      const busyDeliverers = await this.db.user.count({
        where: {
          role: 'DELIVERER',
          deliverer: {
            status: 'BUSY',
          },
        },
      });

      // Calculer distance et revenus
      const totalDistance = deliveries.reduce((sum, d) => sum + (d.distance || 0), 0);
      const averageDistance = totalDeliveries > 0 ? totalDistance / totalDeliveries : 0;
      const totalRevenue = deliveries.reduce((sum, d) => sum + (d.totalPrice || 0), 0);

      return {
        totalDeliveries,
        completedDeliveries,
        pendingDeliveries,
        cancelledDeliveries,
        averageDeliveryTime: Math.round(averageDeliveryTime),
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
        averageRating: Math.round(averageRating * 10) / 10,
        activeDeliverers,
        busyDeliverers,
        totalDistance,
        averageDistance: Math.round(averageDistance * 100) / 100,
        totalRevenue,
      };
    } catch (error) {
      console.error('Error fetching delivery metrics:', error);
      throw new Error('Failed to fetch delivery metrics');
    }
  }

  /**
   * Récupérer les performances des livreurs
   */
  async getDelivererPerformance(timeRange: string, limit: number = 10): Promise<DeliveryPerformance[]> {
    try {
      const dateFilter = this.getDateFilter(timeRange);

      // Récupérer les données des livreurs avec leurs livraisons
      const deliverers = await this.db.user.findMany({
        where: {
          role: 'DELIVERER',
        },
        include: {
          deliveries: {
            where: {
              createdAt: dateFilter,
            },
            include: {
              ratings: true,
            },
          },
          deliverer: true,
        },
      });

      // Calculer les performances
      const performance: DeliveryPerformance[] = deliverers.map(deliverer => {
        const deliveries = deliverer.deliveries;
        const completedDeliveries = deliveries.filter(d => d.status === 'COMPLETED');
        const totalDeliveries = deliveries.length;

        // Calculer les métriques
        const allRatings = deliveries.flatMap(d => d.ratings);
        const averageRating = allRatings.length > 0
          ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
          : 0;

        const completedWithTime = completedDeliveries.filter(d => d.deliveredAt && d.createdAt);
        const averageTime = completedWithTime.length > 0
          ? completedWithTime.reduce((sum, d) => {
              const timeMs = d.deliveredAt!.getTime() - d.createdAt.getTime();
              return sum + (timeMs / (1000 * 60));
            }, 0) / completedWithTime.length
          : 0;

        const onTimeDeliveries = completedWithTime.filter(d => {
          const timeMs = d.deliveredAt!.getTime() - d.createdAt.getTime();
          return (timeMs / (1000 * 60)) <= 45;
        });
        const onTimeRate = completedWithTime.length > 0
          ? (onTimeDeliveries.length / completedWithTime.length) * 100
          : 0;

        const totalEarnings = deliveries.reduce((sum, d) => sum + (d.deliveryFee || 0), 0);

        return {
          delivererId: deliverer.id,
          delivererName: `${deliverer.firstName} ${deliverer.lastName}`,
          totalDeliveries,
          completedDeliveries: completedDeliveries.length,
          averageRating: Math.round(averageRating * 10) / 10,
          averageTime: Math.round(averageTime),
          onTimeRate: Math.round(onTimeRate * 10) / 10,
          totalEarnings,
          rank: 0, // Will be calculated after sorting
        };
      });

      // Trier par performance globale et attribuer les rangs
      const sortedPerformance = performance
        .sort((a, b) => {
          // Score composite basé sur rating, on-time rate et nombre de livraisons
          const scoreA = (a.averageRating * 0.4) + (a.onTimeRate * 0.4) + (a.completedDeliveries * 0.2);
          const scoreB = (b.averageRating * 0.4) + (b.onTimeRate * 0.4) + (b.completedDeliveries * 0.2);
          return scoreB - scoreA;
        })
        .slice(0, limit)
        .map((perf, index) => ({
          ...perf,
          rank: index + 1,
        }));

      return sortedPerformance;
    } catch (error) {
      console.error('Error fetching deliverer performance:', error);
      throw new Error('Failed to fetch deliverer performance');
    }
  }

  /**
   * Récupérer les statistiques par zone
   */
  async getZoneStatistics(timeRange: string): Promise<ZoneStats[]> {
    try {
      const dateFilter = this.getDateFilter(timeRange);

      // Récupérer les données de livraison par zone
      const deliveries = await this.db.delivery.findMany({
        where: {
          createdAt: dateFilter,
        },
        include: {
          ratings: true,
          pickupAddress: true,
          deliveryAddress: true,
        },
      });

      // Grouper par zone (en utilisant le code postal de livraison)
      const zoneMap = new Map<string, {
        deliveries: typeof deliveries;
        zoneName: string;
      }>();

      deliveries.forEach(delivery => {
        const postalCode = delivery.deliveryAddress?.postalCode;
        if (postalCode) {
          const zoneKey = postalCode.substring(0, 2); // Prendre les 2 premiers chiffres
          const zoneName = `Zone ${zoneKey}`;
          
          if (!zoneMap.has(zoneKey)) {
            zoneMap.set(zoneKey, {
              deliveries: [],
              zoneName,
            });
          }
          
          zoneMap.get(zoneKey)!.deliveries.push(delivery);
        }
      });

      // Calculer les statistiques par zone
      const zoneStats: ZoneStats[] = Array.from(zoneMap.entries()).map(([zoneId, data]) => {
        const { deliveries: zoneDeliveries, zoneName } = data;
        
        const totalDeliveries = zoneDeliveries.length;
        
        // Temps moyen de livraison
        const completedWithTime = zoneDeliveries.filter(d => 
          d.status === 'COMPLETED' && d.deliveredAt && d.createdAt
        );
        const averageTime = completedWithTime.length > 0
          ? completedWithTime.reduce((sum, d) => {
              const timeMs = d.deliveredAt!.getTime() - d.createdAt.getTime();
              return sum + (timeMs / (1000 * 60));
            }, 0) / completedWithTime.length
          : 0;

        // Score de popularité basé sur le nombre de livraisons
        const maxDeliveries = Math.max(...Array.from(zoneMap.values()).map(z => z.deliveries.length));
        const popularityScore = maxDeliveries > 0 ? (totalDeliveries / maxDeliveries) * 100 : 0;

        // Note moyenne
        const allRatings = zoneDeliveries.flatMap(d => d.ratings);
        const averageRating = allRatings.length > 0
          ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
          : 0;

        // Revenus totaux
        const totalRevenue = zoneDeliveries.reduce((sum, d) => sum + (d.totalPrice || 0), 0);

        return {
          zoneId,
          zoneName,
          totalDeliveries,
          averageTime: Math.round(averageTime),
          popularityScore: Math.round(popularityScore * 10) / 10,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRevenue,
        };
      });

      // Trier par popularité
      return zoneStats.sort((a, b) => b.popularityScore - a.popularityScore);
    } catch (error) {
      console.error('Error fetching zone statistics:', error);
      throw new Error('Failed to fetch zone statistics');
    }
  }

  /**
   * Créer un filtre de date basé sur la plage de temps
   */
  private getDateFilter(timeRange: string): { gte: Date } {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { gte: startDate };
  }
} 