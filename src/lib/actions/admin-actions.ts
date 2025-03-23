'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { getSession } from '@/lib/session-helper';
import { revalidatePath } from 'next/cache';
import { Role, DeliveryStatus, Status } from '@prisma/client';

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
 * Récupère les statistiques générales pour le tableau de bord admin
 */
export const getAdminDashboardStats = unstable_cache(
  async () => {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return null;
    }
    
    // Compter les utilisateurs par rôle
    const userCountsByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });
    
    // Compter les utilisateurs par statut
    const userCountsByStatus = await prisma.user.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });
    
    // Compter les livraisons par statut
    const shipmentCountsByStatus = await prisma.shipment.groupBy({
      by: ['deliveryStatus'],
      _count: {
        id: true,
      },
    });
    
    // Compter les services par statut
    const serviceCountsByStatus = await prisma.service.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });
    
    // Calculer le chiffre d'affaires total (somme des prix des livraisons)
    const totalRevenue = await prisma.shipment.aggregate({
      _sum: {
        price: true,
      },
    });
    
    // Obtenir les derniers utilisateurs inscrits
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    
    // Obtenir les dernières livraisons
    const recentShipments = await prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        client: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Trouver les utilisateurs en attente de validation
    const pendingUsers = await prisma.user.findMany({
      where: { status: Status.PENDING },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    
    // Statistiques d'entrepôts
    const storageStats = await prisma.storageFacility.findMany({
      include: {
        _count: {
          select: {
            shipments: true,
          },
        },
      },
    });
    
    return {
      userStats: {
        byRole: userCountsByRole.reduce((acc, curr) => {
          acc[curr.role] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        byStatus: userCountsByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        total: await prisma.user.count(),
      },
      shipmentStats: {
        byStatus: shipmentCountsByStatus.reduce((acc, curr) => {
          acc[curr.deliveryStatus] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        total: await prisma.shipment.count(),
      },
      serviceStats: {
        byStatus: serviceCountsByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        }, {} as Record<string, number>),
        total: await prisma.service.count(),
      },
      financialStats: {
        totalRevenue: totalRevenue._sum.price || 0,
        // Autres statistiques financières
      },
      storageStats: storageStats.map(facility => ({
        id: facility.id,
        name: facility.name,
        address: facility.address,
        city: facility.city,
        capacity: facility.capacity,
        occupiedCount: facility._count.shipments,
        occupancyRate: facility.capacity ? (facility._count.shipments / facility.capacity) * 100 : 0,
      })),
      recentActivity: {
        users: recentUsers,
        shipments: recentShipments,
      },
      alerts: {
        pendingUsers,
        // Autres alertes
      },
    };
  },
  ['admin-dashboard-stats'],
  { revalidate: 60 } // Revalider le cache toutes les 60 secondes
);

interface UserSearchParams {
  page?: number;
  limit?: number;
  role?: Role;
  status?: Status;
  search?: string;
}

/**
 * Récupère la liste paginée des utilisateurs pour la gestion des utilisateurs
 */
export async function getAdminUsers({
  page = 1,
  limit = 10,
  role,
  status,
  search,
}: UserSearchParams) {
  // Vérifier que l'utilisateur est admin
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return null;
  }
  
  // Construire les filtres
  const where: Record<string, unknown> = {};
  
  if (role) {
    where.role = role;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  // Calculer le nombre total d'utilisateurs correspondant aux filtres
  const total = await prisma.user.count({ where });
  
  // Récupérer les utilisateurs paginés
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  return {
    data: users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Récupère les détails d'un utilisateur spécifique
 */
export async function getAdminUserDetails(userId: string) {
  // Vérifier que l'utilisateur est admin
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return null;
  }
  
  // Récupérer l'utilisateur avec ses informations détaillées
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      client: true,
      courier: true,
      merchant: true,
      provider: true,
    },
  });
  
  if (!user) {
    return null;
  }
  
  // Récupérer les statistiques spécifiques selon le rôle
  let roleSpecificStats = {};
  
  switch (user.role) {
    case 'CLIENT':
      roleSpecificStats = {
        shipmentCount: await prisma.shipment.count({
          where: { clientId: user.client?.id },
        }),
        // Autres statistiques pour clients
      };
      break;
    case 'COURIER':
      roleSpecificStats = {
        deliveryCount: await prisma.shipmentCourier.count({
          where: { courierId: user.courier?.id },
        }),
        // Autres statistiques pour livreurs
      };
      break;
    case 'MERCHANT':
      roleSpecificStats = {
        productCount: await prisma.product.count({
          where: { merchantId: user.merchant?.id },
        }),
        // Autres statistiques pour commerçants
      };
      break;
    case 'PROVIDER':
      roleSpecificStats = {
        serviceCount: await prisma.service.count({
          where: { providerId: user.provider?.id },
        }),
        // Autres statistiques pour prestataires
      };
      break;
    default:
      break;
  }
  
  return {
    user,
    stats: roleSpecificStats,
  };
}

/**
 * Mettre à jour le statut d'un utilisateur
 */
export async function updateUserStatus(userId: string, status: Status) {
  // Vérifier que l'utilisateur est admin
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    throw new Error("Accès non autorisé");
  }
  
  // Mettre à jour le statut de l'utilisateur
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });
  
  revalidatePath('/dashboard/admin/users');
  revalidatePath(`/dashboard/admin/users/${userId}`);
  
  return updatedUser;
}

// Types for the admin dashboard data
type AdminStats = {
  totalUsers: number
  newUsers: number
  totalShipments: number
  activeShipments: number
  totalProducts: number
  lowStockProducts: number
  revenue: number
  revenueIncrease: number
}

type RecentUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
}

type RecentShipment = {
  id: string
  origin: string
  destination: string
  status: string
  createdAt: Date
}

type UserChartData = {
  month: string
  client: number
  courier: number
  merchant: number
  provider: number
}

type ShipmentChartData = {
  day: string
  pending: number
  in_transit: number
  delivered: number
  cancelled: number
}

type AdminDashboardData = {
  stats: AdminStats
  recentUsers: RecentUser[]
  recentShipments: RecentShipment[]
  userData: UserChartData[]
  shipmentData: ShipmentChartData[]
}

/**
 * Get all data necessary for the admin dashboard
 */
export const getAdminDashboardData = unstable_cache(
  async (): Promise<AdminDashboardData> => {
    // Get user statistics
    const totalUsers = await prisma.user.count();
    
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: lastMonthDate
        }
      }
    });
    
    // Get shipment statistics
    const totalShipments = await prisma.shipment.count();
    const activeShipments = await prisma.shipment.count({
      where: {
        deliveryStatus: {
          in: [DeliveryStatus.PENDING, DeliveryStatus.IN_TRANSIT]
        }
      }
    });
    
    // Get product statistics
    const totalProducts = await prisma.product.count();
    const lowStockProducts = await prisma.product.count({
      where: {
        // Supposons qu'un produit à stock faible est défini par une convention interne
        // Par exemple, un champ 'stockLevel' < 10
        // Si ce champ n'existe pas, nous pouvons le simuler ou utiliser une autre logique métier
        // Ici on le simule, mais dans une vraie application, la condition serait basée sur vos données
        price: { lt: 10 } // Simulation: produits < 10€ considérés comme "à faible stock"
      }
    });
    
    // Get revenue data (from shipments prices)
    const revenueData = await prisma.shipment.aggregate({
      _sum: {
        price: true
      },
      where: {
        createdAt: {
          gte: lastMonthDate
        }
      }
    });
    
    const lastTwoMonthsDate = new Date();
    lastTwoMonthsDate.setMonth(lastTwoMonthsDate.getMonth() - 2);
    const previousMonthRevenue = await prisma.shipment.aggregate({
      _sum: {
        price: true
      },
      where: {
        createdAt: {
          gte: lastTwoMonthsDate,
          lt: lastMonthDate
        }
      }
    });

    const revenue = revenueData._sum.price || 0;
    const previousRevenue = previousMonthRevenue._sum.price || 0;
    
    // Calculer l'augmentation en pourcentage
    let revenueIncrease = 0;
    if (previousRevenue > 0) {
      revenueIncrease = Math.round(((revenue - previousRevenue) / previousRevenue) * 100);
    }
    
    // Get recent users
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });
    
    // Get recent shipments
    const recentShipments = await prisma.shipment.findMany({
      select: {
        id: true,
        fromAddress: true,
        toAddress: true,
        deliveryStatus: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });
    
    // Format recent shipments
    const formattedShipments = recentShipments.map((shipment) => ({
      id: shipment.id,
      origin: shipment.fromAddress || "N/A",
      destination: shipment.toAddress || "N/A",
      status: shipment.deliveryStatus,
      createdAt: shipment.createdAt
    }));
    
    // Generate user chart data by month (last 6 months)
    const userChartData: UserChartData[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthName = startOfMonth.toLocaleDateString('fr-FR', { month: 'short' });
      
      // Count users by role for this month
      const clientCount = await prisma.user.count({
        where: {
          role: "CLIENT",
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      
      const courierCount = await prisma.user.count({
        where: {
          role: "COURIER",
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      
      const merchantCount = await prisma.user.count({
        where: {
          role: "MERCHANT",
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      
      const providerCount = await prisma.user.count({
        where: {
          role: "PROVIDER",
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      
      userChartData.push({
        month: monthName,
        client: clientCount,
        courier: courierCount,
        merchant: merchantCount,
        provider: providerCount
      });
    }
    
    // Generate shipment chart data by day (last 7 days)
    const shipmentChartData: ShipmentChartData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const dayName = startOfDay.toLocaleDateString('fr-FR', { weekday: 'short' });
      
      // Count shipments by status for this day
      const pendingCount = await prisma.shipment.count({
        where: {
          deliveryStatus: "PENDING",
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });
      
      const inTransitCount = await prisma.shipment.count({
        where: {
          deliveryStatus: "IN_TRANSIT",
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });
      
      const deliveredCount = await prisma.shipment.count({
        where: {
          deliveryStatus: "DELIVERED",
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });
      
      const cancelledCount = await prisma.shipment.count({
        where: {
          deliveryStatus: "CANCELLED",
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });
      
      shipmentChartData.push({
        day: dayName,
        pending: pendingCount,
        in_transit: inTransitCount,
        delivered: deliveredCount,
        cancelled: cancelledCount
      });
    }
    
    return {
      stats: {
        totalUsers,
        newUsers,
        totalShipments,
        activeShipments,
        totalProducts,
        lowStockProducts,
        revenue,
        revenueIncrease
      },
      recentUsers,
      recentShipments: formattedShipments,
      userData: userChartData,
      shipmentData: shipmentChartData
    };
  },
  ["admin-dashboard-data"],
  { revalidate: 60 * 5 } // Cache for 5 minutes
) 