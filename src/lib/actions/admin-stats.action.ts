"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cache } from "react";

// Vérifier que l'utilisateur est un administrateur
const checkAdminAccess = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Non autorisé");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Accès restreint aux administrateurs");
  }

  return session.user.id;
};

// Types de données de statistiques
export type MonthlyRevenue = {
  month: string;
  amount: number;
};

export type AdminStats = {
  totalUsers: number;
  totalClients: number;
  totalMerchants: number;
  totalCouriers: number;
  totalProviders: number;
  totalAnnouncements: number;
  totalShipments: number;
  totalServices: number;
  pendingShipments: number;
  completedShipments: number;
  totalRevenue: number;
  averageShipmentValue: number;
  revenueByMonth: MonthlyRevenue[];
};

// Interface pour les statistiques d'utilisateurs par rôle
interface UserStatByRole {
  role: string;
  _count: {
    id: number;
  };
}

// Interface pour les statistiques de livraisons par statut
interface ShipmentStatByStatus {
  status: string;
  _count: {
    id: number;
  };
}

// Interface pour les paiements
interface Payment {
  amount: number;
  createdAt: Date;
}

// Fonction pour obtenir toutes les statistiques de l'administrateur
export const getAdminStats = cache(async (): Promise<AdminStats> => {
  await checkAdminAccess();

  // Récupération des statistiques des utilisateurs
  const userStats = await prisma.user.groupBy({
    by: ['role'],
    _count: {
      id: true,
    },
  });

  // Construire un objet pour un accès facile aux statistiques des utilisateurs par rôle
  const userStatsByRole: Record<string, number> = {};
  userStats.forEach((stat: UserStatByRole) => {
    userStatsByRole[stat.role] = stat._count.id;
  });

  // Récupération des statistiques des livraisons
  const shipmentStats = await prisma.shipment.aggregate({
    _count: {
      id: true,
    },
    _avg: {
      price: true,
    },
    _sum: {
      price: true,
    },
  });

  // Comptage des livraisons par statut
  const shipmentByStatus = await prisma.shipment.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
  });

  // Construire un objet pour un accès facile aux statistiques des livraisons par statut
  const shipmentCountByStatus: Record<string, number> = {};
  shipmentByStatus.forEach((stat: ShipmentStatByStatus) => {
    shipmentCountByStatus[stat.status] = stat._count.id;
  });

  // Récupération des statistiques des services
  const serviceCount = await prisma.service.count();
  
  // Récupération des statistiques des annonces
  const announcementCount = await prisma.announcement.count();
  
  // Récupération des revenus mensuels
  const monthlyPayments = await getMonthlyRevenue();

  return {
    totalUsers: await prisma.user.count(),
    totalClients: userStatsByRole['CLIENT'] || 0,
    totalMerchants: userStatsByRole['COMMERCANT'] || 0,
    totalCouriers: userStatsByRole['LIVREUR'] || 0,
    totalProviders: userStatsByRole['PRESTATAIRE'] || 0,
    totalAnnouncements: announcementCount,
    totalShipments: shipmentStats._count.id,
    totalServices: serviceCount,
    pendingShipments: shipmentCountByStatus['EN_ATTENTE'] || 0,
    completedShipments: shipmentCountByStatus['LIVRÉ'] || 0,
    totalRevenue: shipmentStats._sum.price || 0,
    averageShipmentValue: shipmentStats._avg.price || 0,
    revenueByMonth: monthlyPayments,
  };
});

// Fonction pour obtenir les revenus mensuels
export const getMonthlyRevenue = cache(async (): Promise<MonthlyRevenue[]> => {
  await checkAdminAccess();

  const currentYear = new Date().getFullYear();
  
  // Récupérer tous les paiements de l'année en cours
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        lte: new Date(`${currentYear}-12-31T23:59:59Z`),
      },
      status: "COMPLETED"
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  // Noms des mois en français
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  // Initialiser le tableau des revenus mensuels avec des valeurs à zéro
  const monthlyRevenue: MonthlyRevenue[] = monthNames.map((month, index) => ({
    month: month.substring(0, 3),
    amount: 0,
  }));

  // Agrégation des montants par mois
  payments.forEach((payment: Payment) => {
    const month = payment.createdAt.getMonth();
    monthlyRevenue[month].amount += payment.amount;
  });

  // Retourner les données des 6 derniers mois pour une meilleure lisibilité
  const currentMonth = new Date().getMonth();
  const last6Months = [...monthlyRevenue.slice(currentMonth - 5, currentMonth + 1)];
  
  // Si nous n'avons pas 6 mois complets (début d'année par exemple)
  if (last6Months.length < 6) {
    const previousMonths = monthlyRevenue.slice(12 - (6 - last6Months.length));
    return [...previousMonths, ...last6Months];
  }
  
  return last6Months;
}); 