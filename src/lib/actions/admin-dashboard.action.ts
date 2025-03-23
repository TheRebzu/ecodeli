'use server';

import { db } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import { getSession } from '@/lib/session-helper';
import { DeliveryStatus, Role, Status } from '@prisma/client';

/**
 * Vérifie si l'utilisateur est un administrateur
 */
async function checkAdminAccess() {
  const session = await getSession();
  
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return false;
  }
  
  return true;
}

/**
 * Types pour les données du tableau de bord admin
 */
type AdminDashboardStats = {
  totalUsers: number;
  usersByRole: Record<string, number>;
  activeUsers: number;
  newUsers: { count: number; percentage: number };
  
  totalShipments: number;
  shipmentsByStatus: Record<string, number>;
  shipmentsByMonth: { month: string; count: number }[];
  averageDeliveryTime: number;
  
  totalServices: number;
  servicesByStatus: Record<string, number>;
  
  totalRevenue: number;
  revenueByMonth: { month: string; amount: number }[];
  revenueGrowth: number;
  
  warehouseOccupancy: number;
  lowStockProducts: number;
};

/**
 * Récupère des statistiques avancées pour le tableau de bord admin
 */
export const getAdminDashboardStats = unstable_cache(
  async (): Promise<AdminDashboardStats | null> => {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return null;
    }
    
    // Statistiques utilisateurs
    const totalUsers = await db.user.count();
    
    // Utilisateurs par rôle
    const usersByRole = await db.user.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });
    
    // Utilisateurs actifs
    const activeUsers = await db.user.count({
      where: {
        status: Status.APPROVED,
      },
    });
    
    // Nouveaux utilisateurs ce mois-ci
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    const newUsersThisMonth = await db.user.count({
      where: {
        createdAt: {
          gte: firstDayOfMonth,
        },
      },
    });
    
    const newUsersLastMonth = await db.user.count({
      where: {
        createdAt: {
          gte: firstDayOfLastMonth,
          lt: firstDayOfMonth,
        },
      },
    });
    
    const newUsersPercentage = newUsersLastMonth > 0
      ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
      : 0;
    
    // Statistiques livraisons
    const totalShipments = await db.shipment.count();
    
    // Livraisons par statut
    const shipmentsByStatus = await db.shipment.groupBy({
      by: ['deliveryStatus'],
      _count: {
        id: true,
      },
    });
    
    // Livraisons par mois
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentShipments = await db.shipment.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });
    
    const shipmentsByMonth = Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setMonth(month.getMonth() - index);
      
      const monthName = month.toLocaleString('fr-FR', { month: 'short' });
      const year = month.getFullYear();
      const monthStart = new Date(year, month.getMonth(), 1);
      const monthEnd = new Date(year, month.getMonth() + 1, 0);
      
      const count = recentShipments.filter(
        shipment => shipment.createdAt >= monthStart && shipment.createdAt <= monthEnd
      ).length;
      
      return {
        month: `${monthName} ${year}`,
        count,
      };
    }).reverse();
    
    // Temps moyen de livraison (en heures)
    const deliveredShipments = await db.shipment.findMany({
      where: {
        deliveryStatus: DeliveryStatus.DELIVERED,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });
    
    const averageDeliveryTime = deliveredShipments.length > 0
      ? deliveredShipments.reduce((sum, shipment) => {
          const deliveryTime = shipment.updatedAt.getTime() - shipment.createdAt.getTime();
          return sum + (deliveryTime / (1000 * 60 * 60)); // Convertir en heures
        }, 0) / deliveredShipments.length
      : 0;
    
    // Statistiques services
    const totalServices = await db.service.count();
    
    // Services par statut
    const servicesByStatus = await db.service.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });
    
    // Statistiques financières
    const payments = await db.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });
    
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Revenus par mois
    const revenueByMonth = Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setMonth(month.getMonth() - index);
      
      const monthName = month.toLocaleString('fr-FR', { month: 'short' });
      const year = month.getFullYear();
      const monthStart = new Date(year, month.getMonth(), 1);
      const monthEnd = new Date(year, month.getMonth() + 1, 0);
      
      const amount = payments
        .filter(payment => payment.createdAt >= monthStart && payment.createdAt <= monthEnd)
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      return {
        month: `${monthName} ${year}`,
        amount,
      };
    }).reverse();
    
    // Croissance des revenus
    const currentMonthRevenue = revenueByMonth[revenueByMonth.length - 1]?.amount || 0;
    const previousMonthRevenue = revenueByMonth[revenueByMonth.length - 2]?.amount || 0;
    
    const revenueGrowth = previousMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
      : 0;
    
    // Statistiques entrepôts
    const storageFacilities = await db.storageFacility.findMany({
      include: {
        _count: {
          select: {
            shipments: true,
          },
        },
      },
    });
    
    const totalCapacity = storageFacilities.reduce((sum, facility) => sum + (facility.capacity || 0), 0);
    const totalOccupied = storageFacilities.reduce((sum, facility) => sum + facility._count.shipments, 0);
    
    const warehouseOccupancy = totalCapacity > 0
      ? Math.round((totalOccupied / totalCapacity) * 100)
      : 0;
    
    // Produits avec stock faible (fictif pour le moment)
    const lowStockProducts = Math.floor(Math.random() * 10);
    
    // Compiler toutes les statistiques
    return {
      totalUsers,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr.role] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      activeUsers,
      newUsers: {
        count: newUsersThisMonth,
        percentage: newUsersPercentage,
      },
      
      totalShipments,
      shipmentsByStatus: shipmentsByStatus.reduce((acc, curr) => {
        acc[curr.deliveryStatus] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      shipmentsByMonth,
      averageDeliveryTime: Math.round(averageDeliveryTime * 10) / 10, // Arrondir à 1 décimale
      
      totalServices,
      servicesByStatus: servicesByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      
      totalRevenue,
      revenueByMonth,
      revenueGrowth,
      
      warehouseOccupancy,
      lowStockProducts,
    };
  },
  ['admin-dashboard-advanced-stats'],
  { revalidate: 300 } // Revalider toutes les 5 minutes
); 